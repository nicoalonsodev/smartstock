import type { SupabaseClient } from '@supabase/supabase-js';

import { calcularImportes } from '@/lib/facturacion/calcular-importes';
import { solicitarCAE } from '@/lib/facturacion/arca/wsfe';
import { formatearTipoComprobante } from '@/lib/facturacion/formato';
import { generarPDF } from '@/lib/facturacion/pdf-generator';
import type { Database } from '@/types/database';

type TipoComprobante = Database['public']['Enums']['tipo_comprobante'];

type ClienteFacturaSnapshot = Pick<
  Database['public']['Tables']['cliente']['Row'],
  'nombre' | 'razon_social' | 'cuit_dni' | 'condicion_iva' | 'direccion'
>;

export interface EmitirComprobanteBody {
  tipo: string;
  cliente_id?: string | null;
  items: { producto_id: string; cantidad: number; precio_unitario: number }[];
  notas?: string;
  iva_porcentaje?: number;
  metodo_pago?: 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'mixto';
  metodo_pago_detalle?: Record<string, number>;
  caja_id?: string;
}

export type EmitirComprobanteSuccess = {
  comprobante: Database['public']['Tables']['comprobante']['Row'] & {
    numero: number;
    pdf_url: string | null;
  };
  importes: ReturnType<typeof calcularImportes>;
};

export type EmitirComprobanteResult =
  | { ok: true; data: EmitirComprobanteSuccess }
  | { ok: false; status: number; error: string };

export async function emitirComprobante(
  supabase: SupabaseClient<Database>,
  ctx: { tenantId: string; userId: string },
  body: EmitirComprobanteBody,
  opciones?: { generarPdfYSubir?: boolean; omitirMovimientosStock?: boolean },
): Promise<EmitirComprobanteResult> {
  const generarPdfYSubir = opciones?.generarPdfYSubir !== false;
  const omitirMovimientosStock = opciones?.omitirMovimientosStock === true;

  if (!body.tipo || !body.items?.length) {
    return {
      ok: false,
      status: 400,
      error: 'Faltan campos obligatorios: tipo, items',
    };
  }

  const { data: tenant } = await supabase
    .from('tenant')
    .select('*')
    .eq('id', ctx.tenantId)
    .single();

  if (!tenant) {
    return { ok: false, status: 500, error: 'Tenant no encontrado' };
  }

  const consumidorFinal: ClienteFacturaSnapshot = {
    nombre: 'Consumidor Final',
    razon_social: null,
    cuit_dni: null,
    condicion_iva: 'consumidor_final',
    direccion: null,
  };

  let cliente: ClienteFacturaSnapshot = consumidorFinal;

  if (body.cliente_id) {
    const { data: clienteDb } = await supabase
      .from('cliente')
      .select('*')
      .eq('id', body.cliente_id)
      .single();

    if (!clienteDb) {
      return { ok: false, status: 404, error: 'Cliente no encontrado' };
    }
    cliente = clienteDb;
  }

  const productoIds = body.items.map((i) => i.producto_id);
  const { data: productos } = await supabase
    .from('producto')
    .select('id, codigo, nombre, stock_actual, precio_costo, iva_porcentaje')
    .in('id', productoIds);

  if (!productos || productos.length !== productoIds.length) {
    return { ok: false, status: 404, error: 'Algunos productos no fueron encontrados' };
  }

  const productosMap = new Map(productos.map((p) => [p.id, p]));

  const esPresupuesto = body.tipo === 'presupuesto';
  if (!esPresupuesto && !omitirMovimientosStock) {
    for (const item of body.items) {
      const prod = productosMap.get(item.producto_id)!;
      if (prod.stock_actual < item.cantidad) {
        return {
          ok: false,
          status: 400,
          error: `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock_actual}, solicitado: ${item.cantidad}`,
        };
      }
    }
  }

  const tenantIvaDefault = (tenant as Record<string, unknown>).iva_porcentaje_default as number | undefined;
  const ivaFallback = body.iva_porcentaje ?? tenantIvaDefault ?? 21;

  const itemsConIva = body.items.map((item) => {
    const prod = productosMap.get(item.producto_id);
    return {
      ...item,
      iva_porcentaje: prod?.iva_porcentaje ?? ivaFallback,
    };
  });

  const importes = calcularImportes(itemsConIva, body.tipo, ivaFallback);

  const { data: numero, error: numError } = await supabase.rpc('siguiente_numero_comprobante', {
    p_tenant_id: ctx.tenantId,
    p_tipo: body.tipo as TipoComprobante,
  });

  if (numError) {
    return {
      ok: false,
      status: 500,
      error: `Error al obtener número: ${numError.message}`,
    };
  }

  const { data: comprobante, error: compError } = await supabase
    .from('comprobante')
    .insert({
      tenant_id: ctx.tenantId,
      tipo: body.tipo as never,
      numero,
      fecha: new Date().toISOString().split('T')[0],
      cliente_id: body.cliente_id || null,
      subtotal: importes.subtotal,
      iva_monto: importes.iva_monto,
      iva_porcentaje: importes.iva_porcentaje,
      total: importes.total,
      estado: 'emitido' as const,
      notas: body.notas || null,
      usuario_id: ctx.userId,
      metodo_pago: body.metodo_pago ?? null,
      metodo_pago_detalle: body.metodo_pago_detalle ?? null,
      caja_id: body.caja_id ?? null,
    })
    .select()
    .single();

  if (compError) {
    return { ok: false, status: 500, error: compError.message };
  }

  const itemsInsert = importes.items.map((item) => ({
    comprobante_id: comprobante.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
    precio_costo: productosMap.get(item.producto_id)?.precio_costo ?? 0,
  }));

  const { error: itemsError } = await supabase.from('comprobante_item').insert(itemsInsert);

  if (itemsError) {
    return { ok: false, status: 500, error: `Error al crear items: ${itemsError.message}` };
  }

  if (!esPresupuesto && !omitirMovimientosStock) {
    const esNotaCredito = body.tipo.startsWith('nota_credito');
    const tipoMov = esNotaCredito ? 'entrada' : 'salida';

    for (const item of body.items) {
      const { error: movError } = await supabase.rpc('registrar_movimiento', {
        p_tenant_id: ctx.tenantId,
        p_producto_id: item.producto_id,
        p_tipo: tipoMov,
        p_cantidad: item.cantidad,
        p_motivo: `${formatearTipoComprobante(body.tipo)} #${numero}`,
        p_referencia_tipo: 'factura',
        p_referencia_id: comprobante.id,
        p_usuario_id: ctx.userId,
      });

      if (movError) {
        return { ok: false, status: 500, error: `Error de stock: ${movError.message}` };
      }
    }
  }

  if (!esPresupuesto && body.cliente_id) {
    const esNotaCredito = body.tipo.startsWith('nota_credito');
    const deltaDeuda = esNotaCredito ? -importes.total : importes.total;

    await supabase
      .from('cuenta_corriente')
      .upsert(
        { tenant_id: ctx.tenantId, cliente_id: body.cliente_id, saldo: 0 },
        { onConflict: 'tenant_id,cliente_id', ignoreDuplicates: true },
      );

    const { data: cuenta } = await supabase
      .from('cuenta_corriente')
      .select('id, saldo')
      .eq('tenant_id', ctx.tenantId)
      .eq('cliente_id', body.cliente_id)
      .single();

    if (cuenta) {
      await supabase
        .from('cuenta_corriente')
        .update({ saldo: cuenta.saldo + deltaDeuda })
        .eq('id', cuenta.id);
    }
  }

  let pdfUrl: string | null = null;

  if (generarPdfYSubir) {
    const itemsPDF = body.items.map((item) => {
      const prod = productosMap.get(item.producto_id)!;
      const rate = prod.iva_porcentaje ?? ivaFallback;
      const lineGross = Math.round(item.cantidad * item.precio_unitario * 100) / 100;
      const lineIva = Math.round(((lineGross * rate) / (100 + rate)) * 100) / 100;
      return {
        cantidad: item.cantidad,
        descripcion: prod.nombre,
        precio_unitario: item.precio_unitario,
        subtotal: lineGross,
        iva_porcentaje: rate,
        iva_monto: lineIva,
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

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    const pdfPath = `${ctx.tenantId}/comprobantes/${body.tipo}_${numero}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (!uploadError) {
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(pdfPath);
      pdfUrl = publicUrl.publicUrl;
      await supabase.from('comprobante').update({ pdf_url: pdfUrl }).eq('id', comprobante.id);
    }
  }

  // --- POST-EMISIÓN: solicitar CAE si el módulo facturador_arca está activo ---
  let cae: string | null = null;
  let caeVencimiento: string | null = null;

  const { data: moduloConfig } = await supabase
    .from('modulo_config')
    .select('facturador_arca')
    .maybeSingle();

  const arcaActivo = moduloConfig && (moduloConfig as Record<string, boolean>).facturador_arca;

  if (arcaActivo) {
    const { data: arcaConfig } = await supabase
      .from('arca_config')
      .select('tenant_id, cuit_emisor, punto_de_venta, ambiente')
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (arcaConfig && arcaConfig.cuit_emisor && arcaConfig.punto_de_venta) {
      const resultado = await solicitarCAE(
        supabase,
        {
          tenant_id: arcaConfig.tenant_id,
          cuit_emisor: arcaConfig.cuit_emisor,
          punto_de_venta: arcaConfig.punto_de_venta,
          ambiente: arcaConfig.ambiente,
        },
        {
          tenantId: ctx.tenantId,
          tipo: body.tipo,
          numero,
          fecha: comprobante.fecha,
          clienteCuitDni: cliente.cuit_dni || null,
          importeTotal: importes.total,
          importeNeto: importes.subtotal,
          importeIVA: importes.iva_monto,
          alicuotaIVA: importes.iva_porcentaje,
        },
        comprobante.id,
      );

      if (resultado.aprobado && resultado.cae) {
        cae = resultado.cae;
        caeVencimiento = resultado.caeVencimiento;
        await supabase
          .from('comprobante')
          .update({
            cae: resultado.cae,
            cae_vencimiento: resultado.caeVencimiento,
            estado: 'emitido' as never,
          })
          .eq('id', comprobante.id);

        if (generarPdfYSubir) {
          const itemsPDFCae = body.items.map((item) => {
            const prod = productosMap.get(item.producto_id)!;
            const rate = prod.iva_porcentaje ?? ivaFallback;
            const lineGross = Math.round(item.cantidad * item.precio_unitario * 100) / 100;
            const lineIva = Math.round(((lineGross * rate) / (100 + rate)) * 100) / 100;
            return {
              cantidad: item.cantidad,
              descripcion: prod.nombre,
              precio_unitario: item.precio_unitario,
              subtotal: lineGross,
              iva_porcentaje: rate,
              iva_monto: lineIva,
            };
          });

          const pdfConCAE = generarPDF(
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
              cae: resultado.cae,
              cae_vencimiento: resultado.caeVencimiento,
            },
            itemsPDFCae,
          );

          const pdfBufferCae = Buffer.from(pdfConCAE.output('arraybuffer'));
          const pdfPathCae = `${ctx.tenantId}/comprobantes/${body.tipo}_${numero}.pdf`;

          const { error: uploadErr } = await supabase.storage
            .from('comprobantes')
            .upload(pdfPathCae, pdfBufferCae, {
              contentType: 'application/pdf',
              upsert: true,
            });

          if (!uploadErr) {
            const { data: pubUrl } = supabase.storage.from('comprobantes').getPublicUrl(pdfPathCae);
            pdfUrl = pubUrl.publicUrl;
            await supabase.from('comprobante').update({ pdf_url: pdfUrl }).eq('id', comprobante.id);
          }
        }
      } else if (resultado.errores.some((e) => e.codigo === 'NETWORK')) {
        await supabase
          .from('comprobante')
          .update({ estado: 'pendiente_arca' as never })
          .eq('id', comprobante.id);
      } else {
        await supabase
          .from('comprobante')
          .update({ estado: 'error_arca' as never })
          .eq('id', comprobante.id);
      }
    }
  }

  return {
    ok: true,
    data: {
      comprobante: {
        ...comprobante,
        numero,
        pdf_url: pdfUrl,
        ...(cae ? { cae, cae_vencimiento: caeVencimiento } : {}),
      },
      importes,
    },
  };
}
