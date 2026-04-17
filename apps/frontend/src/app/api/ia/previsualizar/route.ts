import { getTenantSession } from '@/lib/api/tenant-session';
import { sugerirPrecioVenta } from '@/lib/ia/sugerir-margen';
import { moduloGuard } from '@/lib/modulos/guard';
import { NextResponse } from 'next/server';

export interface CambioPrecioDto {
  producto_id: string;
  codigo: string;
  nombre: string;
  precio_venta_anterior: number;
  precio_venta_nuevo: number;
  precio_costo_anterior: number | null;
  precio_costo_nuevo: number | null;
  variacion_porcentaje: number;
}

type FilaPre = {
  codigo: string | null;
  nombre: string;
  precio_venta: number | null;
  precio_costo: number | null;
};

export async function POST(request: Request) {
  const guard = await moduloGuard('ia_precios');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  let body: { filas?: FilaPre[] };
  try {
    body = (await request.json()) as { filas?: FilaPre[] };
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const filas = body.filas ?? [];
  if (filas.length === 0) {
    return NextResponse.json({ cambios: [], sugerencias: [] });
  }

  const codigos = [
    ...new Set(
      filas.map((f) => (f.codigo != null ? String(f.codigo).trim() : '')).filter(Boolean),
    ),
  ];

  let porCodigo = new Map<
    string,
    { id: string; codigo: string; nombre: string; precio_costo: number; precio_venta: number }
  >();

  if (codigos.length > 0) {
    const { data: productos, error } = await session.supabase
      .from('producto')
      .select('id, codigo, nombre, precio_costo, precio_venta')
      .eq('tenant_id', session.tenantId)
      .eq('activo', true)
      .in('codigo', codigos);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    porCodigo = new Map((productos ?? []).map((p) => [p.codigo.toLowerCase(), p]));
  }

  const cambios: CambioPrecioDto[] = [];
  const cambioPorProducto = new Map<string, CambioPrecioDto>();

  for (const f of filas) {
    if (!f.codigo || String(f.codigo).trim() === '') continue;
    const p = porCodigo.get(String(f.codigo).trim().toLowerCase());
    if (!p) continue;

    const ventaNuevo = f.precio_venta ?? p.precio_venta;
    const costoNuevo = f.precio_costo ?? p.precio_costo;
    const ventaAnt = p.precio_venta;
    const costoAnt = p.precio_costo;

    if (ventaNuevo === ventaAnt && costoNuevo === costoAnt) continue;

    const variacion =
      ventaAnt > 0 ? ((ventaNuevo - ventaAnt) / ventaAnt) * 100 : ventaNuevo !== ventaAnt ? 100 : 0;

    cambioPorProducto.set(p.id, {
      producto_id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      precio_venta_anterior: ventaAnt,
      precio_venta_nuevo: ventaNuevo,
      precio_costo_anterior: costoAnt,
      precio_costo_nuevo: costoNuevo,
      variacion_porcentaje: Math.round(variacion * 10) / 10,
    });
  }

  for (const c of cambioPorProducto.values()) {
    cambios.push(c);
  }

  cambios.sort((a, b) => Math.abs(b.variacion_porcentaje) - Math.abs(a.variacion_porcentaje));

  const sugerencias: (
    | { precioSugerido: number; margenUsado: number; fuente: string }
    | null
  )[] = [];

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    if (
      f.precio_costo == null ||
      typeof f.precio_costo !== 'number' ||
      f.precio_costo < 0 ||
      !f.codigo
    ) {
      sugerencias.push(null);
      continue;
    }
    const p = porCodigo.get(String(f.codigo).trim().toLowerCase());
    if (!p) {
      sugerencias.push(null);
      continue;
    }
    const s = await sugerirPrecioVenta(session.supabase, p.id, f.precio_costo);
    sugerencias.push({
      precioSugerido: s.precioSugerido,
      margenUsado: s.margenUsado,
      fuente: s.fuente,
    });
  }

  return NextResponse.json({ cambios, sugerencias });
}
