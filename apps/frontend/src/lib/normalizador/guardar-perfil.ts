import { createBrowserClient } from '@/lib/supabase/client';

import type { MapeoColumna } from './mapear';

export async function guardarPerfilMapeo(
  proveedorId: string,
  mapeo: MapeoColumna[],
  nombreArchivo: string,
  filaHeader: number
) {
  const supabase = createBrowserClient();

  const mapeoObj: Record<string, string | null> = {};
  const columnasIgnoradas: string[] = [];

  for (const col of mapeo) {
    if (col.ignorar || !col.campoDetectado) {
      columnasIgnoradas.push(col.headerOriginal);
    } else {
      mapeoObj[col.campoDetectado] = col.headerOriginal;
    }
  }

  const perfilExcel = {
    nombre_archivo_ejemplo: nombreArchivo,
    fila_header: filaHeader,
    mapeo: mapeoObj,
    columnas_ignoradas: columnasIgnoradas,
    ultima_importacion: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('proveedor')
    .update({ mapeo_excel: perfilExcel })
    .eq('id', proveedorId);

  return { error };
}
