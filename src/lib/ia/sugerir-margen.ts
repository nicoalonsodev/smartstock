import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

export async function sugerirPrecioVenta(
  supabase: SupabaseClient<Database>,
  productoId: string,
  nuevoPrecioCosto: number,
): Promise<{ precioSugerido: number; margenUsado: number; fuente: string }> {
  const { data: producto } = await supabase
    .from('producto')
    .select('precio_costo, precio_venta, categoria_id')
    .eq('id', productoId)
    .single();

  if (producto && producto.precio_costo > 0 && producto.precio_venta > 0) {
    const margenActual = ((producto.precio_venta - producto.precio_costo) / producto.precio_costo) * 100;
    if (margenActual > 0) {
      return {
        precioSugerido: Math.round(nuevoPrecioCosto * (1 + margenActual / 100) * 100) / 100,
        margenUsado: margenActual,
        fuente: 'margen_actual_producto',
      };
    }
  }

  if (producto?.categoria_id) {
    const { data: productosCat } = await supabase
      .from('producto')
      .select('precio_costo, precio_venta')
      .eq('categoria_id', producto.categoria_id)
      .eq('activo', true)
      .gt('precio_costo', 0)
      .gt('precio_venta', 0);

    if (productosCat && productosCat.length > 0) {
      const margenes = productosCat.map(
        (p) => ((p.precio_venta - p.precio_costo) / p.precio_costo) * 100,
      );
      const margenPromedio = margenes.reduce((s, m) => s + m, 0) / margenes.length;

      if (margenPromedio > 0) {
        return {
          precioSugerido: Math.round(nuevoPrecioCosto * (1 + margenPromedio / 100) * 100) / 100,
          margenUsado: margenPromedio,
          fuente: 'margen_promedio_categoria',
        };
      }
    }
  }

  return {
    precioSugerido: Math.round(nuevoPrecioCosto * 1.3 * 100) / 100,
    margenUsado: 30,
    fuente: 'margen_default',
  };
}
