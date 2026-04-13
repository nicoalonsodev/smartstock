import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { calcularImportes } from '@/lib/facturacion/calcular-importes';
import { formatearTipoComprobante } from '@/lib/facturacion/formato';
import { generarPDF } from '@/lib/facturacion/pdf-generator';
import { moduloGuard } from '@/lib/modulos/guard';
import type { Database } from '@/types/database';

type TipoComprobante = Database['public']['Enums']['tipo_comprobante'];

interface EmitirRequest {
  tipo: string;
  cliente_id: string;
  items: { producto_id: string; cantidad: number; precio_unitario: number }[];
  notas?: string;
  iva_porcentaje?: number;
}

export async function POST(request: Request) {
  // 1. Verificar módulo
  const guard = await moduloGuard('facturador_simple');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  let body: EmitirRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.tipo || !body.cliente_id || !body.items?.length) {
    return NextResponse.json(
      { error: 'Faltan campos obligatorios: tipo, cliente_id, items' },
      { status: 400 },
    );
  }

  // 2. Obtener datos del tenant
  const { data: tenant } = await session.supabase
    .from('tenant')
    .select('*')
    .eq('id', session.tenantId)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 500 });
  }

  // 3. Obtener datos del cliente
  const { data: cliente } = await session.supabase
    .from('cliente')
    .select('*')
    .eq('id', body.cliente_id)
    .single();

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  // 4. Obtener datos de productos
  const productoIds = body.items.map((i) => i.producto_id);
  const { data: productos } = await session.supabase
    .from('producto')
    .select('id, codigo, nombre, stock_actual')
    .in('id', productoIds);

  if (!productos || productos.length !== productoIds.length) {
    return NextResponse.json(
      { error: 'Algunos productos no fueron encontrados' },
      { status: 404 },
    );
  }

  const productosMap = new Map(productos.map((p) => [p.id, p]));

  // 5. Verificar stock disponible (excepto presupuestos)
  const esPresupuesto = body.tipo === 'presupuesto';
  if (!esPresupuesto) {
    for (const item of body.items) {
      const prod = productosMap.get(item.producto_id)!;
      if (prod.stock_actual < item.cantidad) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock_actual}, solicitado: ${item.cantidad}`,
          },
          { status: 400 },
        );
      }
    }
  }

  // 6. Calcular importes
  const importes = calcularImportes(body.items, body.tipo, body.iva_porcentaje);

  // 7. Obtener siguiente número
  const { data: numero, error: numError } = await session.supabase.rpc(
    'siguiente_numero_comprobante',
    {
      p_tenant_id: session.tenantId,
      p_tipo: body.tipo as TipoComprobante,
    },
  );

  if (numError) {
    return NextResponse.json(
      { error: `Error al obtener número: ${numError.message}` },
      { status: 500 },
    );
  }

  // 8. Crear comprobante
  const { data: comprobante, error: compError } = await session.supabase
    .from('comprobante')
    .insert({
      tenant_id: session.tenantId,
      tipo: body.tipo as never,
      numero,
      fecha: new Date().toISOString().split('T')[0],
      cliente_id: body.cliente_id,
      subtotal: importes.subtotal,
      iva_monto: importes.iva_monto,
      iva_porcentaje: importes.iva_porcentaje,
      total: importes.total,
      estado: 'emitido' as const,
      notas: body.notas || null,
      usuario_id: session.userId,
    })
    .select()
    .single();

  if (compError) {
    return NextResponse.json({ error: compError.message }, { status: 500 });
  }

  // 9. Crear items del comprobante
  const itemsInsert = importes.items.map((item) => ({
    comprobante_id: comprobante.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
  }));

  const { error: itemsError } = await session.supabase
    .from('comprobante_item')
    .insert(itemsInsert);

  if (itemsError) {
    return NextResponse.json(
      { error: `Error al crear items: ${itemsError.message}` },
      { status: 500 },
    );
  }

  // 10. Registrar movimientos de stock (excepto presupuestos)
  if (!esPresupuesto) {
    const esNotaCredito = body.tipo.startsWith('nota_credito');
    const tipoMov = esNotaCredito ? 'entrada' : 'salida';

    for (const item of body.items) {
      const { error: movError } = await session.supabase.rpc(
        'registrar_movimiento',
        {
          p_tenant_id: session.tenantId,
          p_producto_id: item.producto_id,
          p_tipo: tipoMov,
          p_cantidad: item.cantidad,
          p_motivo: `${formatearTipoComprobante(body.tipo)} #${numero}`,
          p_referencia_tipo: 'factura',
          p_referencia_id: comprobante.id,
          p_usuario_id: session.userId,
        },
      );

      if (movError) {
        return NextResponse.json(
          { error: `Error de stock: ${movError.message}` },
          { status: 500 },
        );
      }
    }
  }

  // 11. Generar PDF
  const itemsPDF = body.items.map((item) => {
    const prod = productosMap.get(item.producto_id)!;
    return {
      cantidad: item.cantidad,
      descripcion: prod.nombre,
      precio_unitario: item.precio_unitario,
      subtotal: Math.round(item.cantidad * item.precio_unitario * 100) / 100,
    };
  });

  const pdf = generarPDF(
    {
      nombre: tenant.nombre,
      razon_social: tenant.razon_social,
      cuit: tenant.cuit,
      domicilio: tenant.domicilio,
      condicion_iva: tenant.condicion_iva ?? 'consumidor_final',
      punto_de_venta: tenant.punto_de_venta,
    },
    {
      nombre: cliente.nombre,
      razon_social: cliente.razon_social,
      cuit_dni: cliente.cuit_dni,
      condicion_iva: cliente.condicion_iva ?? 'consumidor_final',
      direccion: cliente.direccion,
    },
    {
      tipo: body.tipo,
      numero,
      fecha: comprobante.fecha,
      subtotal: importes.subtotal,
      iva_monto: importes.iva_monto,
      iva_porcentaje: importes.iva_porcentaje,
      total: importes.total,
      notas: body.notas || null,
      cae: null,
      cae_vencimiento: null,
    },
    itemsPDF,
  );

  // 12. Subir PDF a Supabase Storage
  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
  const pdfPath = `${session.tenantId}/comprobantes/${body.tipo}_${numero}.pdf`;

  const { error: uploadError } = await session.supabase.storage
    .from('comprobantes')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  let pdfUrl: string | null = null;
  if (!uploadError) {
    const { data: publicUrl } = session.supabase.storage
      .from('comprobantes')
      .getPublicUrl(pdfPath);

    pdfUrl = publicUrl.publicUrl;

    await session.supabase
      .from('comprobante')
      .update({ pdf_url: pdfUrl })
      .eq('id', comprobante.id);
  }

  return NextResponse.json(
    {
      comprobante: { ...comprobante, numero, pdf_url: pdfUrl },
      importes,
    },
    { status: 201 },
  );
}
