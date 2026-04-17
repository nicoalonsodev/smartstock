import type { ArchivoParseado } from '@/lib/normalizador/parsear';
import type { MapeoColumna } from '@/lib/normalizador/mapear';

export const IMPORT_DRAFT_KEY = 'smartstock-import-draft';

export type ImportDraftV1 = {
  version: 1;
  archivo: ArchivoParseado;
  proveedorId: string | null;
  guardarPerfil: boolean;
  mapeo: MapeoColumna[];
  /** true si el mapeo vino de proveedor.mapeo_excel y se omitió la pantalla de mapeo */
  saltoMapeoPorPerfil?: boolean;
};

export function readImportDraft(): ImportDraftV1 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(IMPORT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImportDraftV1;
    if (parsed?.version !== 1 || !parsed.archivo?.headers) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeImportDraft(draft: ImportDraftV1) {
  sessionStorage.setItem(IMPORT_DRAFT_KEY, JSON.stringify(draft));
}

export function clearImportDraft() {
  sessionStorage.removeItem(IMPORT_DRAFT_KEY);
}

export const IMPORT_RESULT_KEY = 'smartstock-import-result';

export type ImportResultPayload = {
  total_filas: number;
  productos_creados: number;
  productos_actualizados: number;
  filas_con_error: number;
  detalle_errores: { fila: number; campo: string; error: string; valor_original?: string }[];
  duplicadas_descartadas: number;
  archivo_nombre: string;
};

export function readImportResult(): ImportResultPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(IMPORT_RESULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImportResultPayload;
  } catch {
    return null;
  }
}

export function writeImportResult(result: ImportResultPayload) {
  sessionStorage.setItem(IMPORT_RESULT_KEY, JSON.stringify(result));
}

export function clearImportResult() {
  sessionStorage.removeItem(IMPORT_RESULT_KEY);
}
