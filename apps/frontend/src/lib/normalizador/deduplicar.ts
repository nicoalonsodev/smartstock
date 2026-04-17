import { type FilaValidada } from './validar';

export function deduplicarFilas(filas: FilaValidada[]): {
  unicas: FilaValidada[];
  duplicadasDescartadas: number;
} {
  const mapa = new Map<string, FilaValidada>();
  let descartadas = 0;

  for (const fila of filas) {
    if (!fila.valida) continue;

    const codigo = fila.datos.codigo;
    if (codigo) {
      const key = String(codigo).toLowerCase();
      if (mapa.has(key)) {
        descartadas++;
      }
      mapa.set(key, fila);
    } else {
      mapa.set(`__nocode_${fila.filaOriginal}`, fila);
    }
  }

  return {
    unicas: Array.from(mapa.values()),
    duplicadasDescartadas: descartadas,
  };
}
