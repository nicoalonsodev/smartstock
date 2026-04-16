import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

type UnidadMedida = Database['public']['Enums']['unidad_medida'];

const UNIDADES_VALIDAS: UnidadMedida[] = [
  'unidad',
  'kg',
  'litro',
  'metro',
  'caja',
  'pack',
  'gramo',
  'ml',
];

function mapUnidad(s: string | null | undefined): UnidadMedida {
  const v = (s ?? 'unidad').toLowerCase().trim();
  return UNIDADES_VALIDAS.includes(v as UnidadMedida) ? (v as UnidadMedida) : 'unidad';
}

export interface FilaImportacion {
  codigo: string | null;
  nombre: string;
  precio_costo?: number | null;
  precio_venta?: number | null;
  stock_actual?: number | null;
  stock_minimo?: number | null;
  categoria?: string | null;
  unidad?: string | null;
  fecha_vencimiento?: string | null;
}

export interface EjecutarImportacionParams {
  filas: FilaImportacion[];
  proveedor_id: string | null;
  archivo_nombre: string;
  origen: 'importacion_excel' | 'ia_pdf';
}

export interface EjecutarImportacionResultado {
  total_filas: number;
  productos_creados: number;
  productos_actualizados: number;
  filas_con_error: number;
  detalle_errores: {
    fila: number;
    campo: string;
    valor_original: string;
    error: string;
  }[];
}

export async function ejecutarImportacionFilas(
  supabase: SupabaseClient<Database>,
  ctx: { tenantId: string; userId: string },
  params: EjecutarImportacionParams,
): Promise<EjecutarImportacionResultado> {
  const { filas, proveedor_id, archivo_nombre, origen } = params;
  const tenantId = ctx.tenantId;

  let productosCreados = 0;
  let productosActualizados = 0;
  let filasConError = 0;
  const detalleErrores: EjecutarImportacionResultado['detalle_errores'] = [];

  const { data: categorias } = await supabase
    .from('categoria')
    .select('id, nombre')
    .eq('activa', true);

  const categoriasMap = new Map((categorias ?? []).map((c) => [c.nombre.toLowerCase(), c.id]));

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];

    try {
      if (!fila.nombre || fila.nombre.trim() === '') {
        throw new Error('Nombre vacío');
      }

      let categoriaId: string | null = null;
      if (fila.categoria) {
        const catNombre = fila.categoria.toLowerCase();
        if (categoriasMap.has(catNombre)) {
          categoriaId = categoriasMap.get(catNombre)!;
        } else {
          const { data: nuevaCat } = await supabase
            .from('categoria')
            .insert({ tenant_id: tenantId, nombre: fila.categoria })
            .select()
            .single();
          if (nuevaCat) {
            categoriaId = nuevaCat.id;
            categoriasMap.set(catNombre, nuevaCat.id);
          }
        }
      }

      let productoExistente = null;
      if (fila.codigo) {
        const { data } = await supabase
          .from('producto')
          .select('id, precio_costo, precio_venta, stock_actual')
          .eq('codigo', fila.codigo)
          .eq('tenant_id', tenantId)
          .eq('activo', true)
          .maybeSingle();
        productoExistente = data;
      }

      if (productoExistente) {
        const updates: Database['public']['Tables']['producto']['Update'] = {
          nombre: fila.nombre,
        };
        if (fila.precio_costo != null) updates.precio_costo = fila.precio_costo;
        if (fila.precio_venta != null) updates.precio_venta = fila.precio_venta;
        if (fila.stock_minimo != null) updates.stock_minimo = fila.stock_minimo;
        if (fila.unidad) updates.unidad = mapUnidad(fila.unidad);
        if (fila.fecha_vencimiento) updates.fecha_vencimiento = fila.fecha_vencimiento;
        if (categoriaId) updates.categoria_id = categoriaId;
        if (proveedor_id) updates.proveedor_id = proveedor_id;

        await supabase
          .from('producto')
          .update(updates)
          .eq('id', productoExistente.id)
          .eq('tenant_id', tenantId);

        const costoAnterior = productoExistente.precio_costo;
        const ventaAnterior = productoExistente.precio_venta;
        const costoNuevo = fila.precio_costo ?? costoAnterior;
        const ventaNuevo = fila.precio_venta ?? ventaAnterior;

        if (costoAnterior !== costoNuevo || ventaAnterior !== ventaNuevo) {
          const margenAnt =
            costoAnterior > 0 ? ((ventaAnterior - costoAnterior) / costoAnterior) * 100 : 0;
          const margenNuevo = costoNuevo > 0 ? ((ventaNuevo - costoNuevo) / costoNuevo) * 100 : 0;

          await supabase.from('precio_historial').insert({
            tenant_id: tenantId,
            producto_id: productoExistente.id,
            precio_costo_anterior: costoAnterior,
            precio_costo_nuevo: costoNuevo,
            precio_venta_anterior: ventaAnterior,
            precio_venta_nuevo: ventaNuevo,
            margen_anterior: margenAnt,
            margen_nuevo: margenNuevo,
            origen,
          });
        }

        if (fila.stock_actual != null && fila.stock_actual !== productoExistente.stock_actual) {
          await supabase.rpc('registrar_movimiento', {
            p_tenant_id: tenantId,
            p_producto_id: productoExistente.id,
            p_tipo: 'ajuste',
            p_cantidad: fila.stock_actual,
            p_motivo: `Ajuste por importación: ${archivo_nombre}`,
            p_referencia_tipo: 'importacion',
            p_usuario_id: ctx.userId,
          });
        }

        productosActualizados++;
      } else {
        const codigo = fila.codigo || `AUTO-${Date.now()}-${i}`;

        const { data: nuevoProducto, error: insertErr } = await supabase
          .from('producto')
          .insert({
            tenant_id: tenantId,
            codigo,
            nombre: fila.nombre,
            categoria_id: categoriaId,
            proveedor_id: proveedor_id,
            unidad: mapUnidad(fila.unidad),
            precio_costo: fila.precio_costo ?? 0,
            precio_venta: fila.precio_venta ?? 0,
            stock_actual: 0,
            stock_minimo: fila.stock_minimo ?? 0,
            fecha_vencimiento: fila.fecha_vencimiento || null,
          })
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        if (fila.stock_actual && fila.stock_actual > 0 && nuevoProducto) {
          await supabase.rpc('registrar_movimiento', {
            p_tenant_id: tenantId,
            p_producto_id: nuevoProducto.id,
            p_tipo: 'entrada',
            p_cantidad: fila.stock_actual,
            p_motivo: `Stock inicial por importación: ${archivo_nombre}`,
            p_referencia_tipo: 'importacion',
            p_usuario_id: ctx.userId,
          });
        }

        productosCreados++;
      }
    } catch (err) {
      filasConError++;
      detalleErrores.push({
        fila: i + 1,
        campo: 'general',
        valor_original: JSON.stringify(fila),
        error: (err as Error).message,
      });
    }
  }

  await supabase.from('importacion_log').insert({
    tenant_id: tenantId,
    proveedor_id: proveedor_id,
    archivo_nombre,
    origen,
    total_filas: filas.length,
    filas_exitosas: productosCreados + productosActualizados,
    filas_con_error: filasConError,
    productos_creados: productosCreados,
    productos_actualizados: productosActualizados,
    detalle_errores: detalleErrores.length > 0 ? detalleErrores : null,
    usuario_id: ctx.userId,
  });

  return {
    total_filas: filas.length,
    productos_creados: productosCreados,
    productos_actualizados: productosActualizados,
    filas_con_error: filasConError,
    detalle_errores: detalleErrores,
  };
}
