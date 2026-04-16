import { ALIASES, type CampoProducto } from './aliases';
import { normalizarString } from './normalizar';

export type { CampoProducto };

export interface MapeoColumna {
  headerOriginal: string;
  campoDetectado: CampoProducto | null;
  confianza: 'exacta' | 'parcial' | 'ninguna';
  ignorar: boolean;
  /** Columna agregada en el paso preview (no existe en el archivo). */
  sintetica?: boolean;
}

export function mapearHeaders(headers: string[]): MapeoColumna[] {
  const aliasesNormalizados: Record<CampoProducto, string[]> = {} as Record<
    CampoProducto,
    string[]
  >;
  for (const [campo, aliases] of Object.entries(ALIASES) as [CampoProducto, string[]][]) {
    aliasesNormalizados[campo] = aliases.map(normalizarString);
  }

  const camposUsados = new Set<CampoProducto>();

  return headers.map((header) => {
    const headerNorm = normalizarString(header);

    for (const [campo, aliasesNorm] of Object.entries(aliasesNormalizados) as [
      CampoProducto,
      string[],
    ][]) {
      if (camposUsados.has(campo)) continue;

      if (aliasesNorm.includes(headerNorm)) {
        camposUsados.add(campo);
        return {
          headerOriginal: header,
          campoDetectado: campo,
          confianza: 'exacta',
          ignorar: false,
        };
      }
    }

    for (const [campo, aliasesNorm] of Object.entries(aliasesNormalizados) as [
      CampoProducto,
      string[],
    ][]) {
      if (camposUsados.has(campo)) continue;

      const matchParcial = aliasesNorm.some(
        (alias) => headerNorm.includes(alias) || alias.includes(headerNorm)
      );

      if (matchParcial) {
        camposUsados.add(campo);
        return {
          headerOriginal: header,
          campoDetectado: campo,
          confianza: 'parcial',
          ignorar: false,
        };
      }
    }

    return {
      headerOriginal: header,
      campoDetectado: null,
      confianza: 'ninguna',
      ignorar: true,
    };
  });
}

export function aplicarPerfilProveedor(
  headers: string[],
  mapeoGuardado: Record<string, string | null>
): MapeoColumna[] {
  return headers.map((header) => {
    const campoMapeado = Object.entries(mapeoGuardado).find(
      ([, headerGuardado]) => headerGuardado === header
    );

    if (campoMapeado) {
      return {
        headerOriginal: header,
        campoDetectado: campoMapeado[0] as CampoProducto,
        confianza: 'exacta',
        ignorar: false,
      };
    }

    return {
      headerOriginal: header,
      campoDetectado: null,
      confianza: 'ninguna',
      ignorar: true,
    };
  });
}
