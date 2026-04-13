import { type CampoProducto } from './aliases';

export interface FilaValidada {
  filaOriginal: number;
  datos: Partial<Record<CampoProducto, string | number | null>>;
  errores: { campo: CampoProducto; mensaje: string; valorOriginal: unknown }[];
  valida: boolean;
}

export function validarFilas(
  filas: Record<string, string | number | null>[],
  mapeo: { headerOriginal: string; campoDetectado: CampoProducto | null; ignorar: boolean }[]
): FilaValidada[] {
  return filas.map((fila, index) => {
    const datos: Partial<Record<CampoProducto, string | number | null>> = {};
    const errores: FilaValidada['errores'] = [];

    for (const col of mapeo) {
      if (col.ignorar || !col.campoDetectado) continue;

      const valorRaw = fila[col.headerOriginal];
      const campo = col.campoDetectado;

      switch (campo) {
        case 'codigo':
          datos[campo] = valorRaw != null ? String(valorRaw).trim() : null;
          break;

        case 'nombre':
          if (!valorRaw || String(valorRaw).trim() === '') {
            errores.push({
              campo,
              mensaje: 'El nombre del producto no puede estar vacío',
              valorOriginal: valorRaw,
            });
            datos[campo] = null;
          } else {
            datos[campo] = String(valorRaw).trim();
          }
          break;

        case 'precio_costo':
        case 'precio_venta': {
          const precio = parsearPrecio(valorRaw);
          if (valorRaw != null && String(valorRaw).trim() !== '' && precio === null) {
            errores.push({
              campo,
              mensaje: 'El precio debe ser un número válido',
              valorOriginal: valorRaw,
            });
            datos[campo] = null;
          } else if (precio !== null && precio < 0) {
            errores.push({
              campo,
              mensaje: 'El precio no puede ser negativo',
              valorOriginal: valorRaw,
            });
            datos[campo] = null;
          } else {
            datos[campo] = precio;
          }
          break;
        }

        case 'stock_actual':
        case 'stock_minimo': {
          const num = parsearEntero(valorRaw);
          if (valorRaw != null && String(valorRaw).trim() !== '' && num === null) {
            errores.push({
              campo,
              mensaje: 'Debe ser un número entero',
              valorOriginal: valorRaw,
            });
            datos[campo] = null;
          } else if (num !== null && num < 0) {
            errores.push({
              campo,
              mensaje: 'No puede ser negativo',
              valorOriginal: valorRaw,
            });
            datos[campo] = null;
          } else {
            datos[campo] = num;
          }
          break;
        }

        case 'fecha_vencimiento': {
          if (valorRaw != null && String(valorRaw).trim() !== '') {
            const fecha = parsearFecha(String(valorRaw));
            if (!fecha) {
              errores.push({
                campo,
                mensaje: 'Formato de fecha no reconocido',
                valorOriginal: valorRaw,
              });
              datos[campo] = null;
            } else {
              datos[campo] = fecha;
            }
          } else {
            datos[campo] = null;
          }
          break;
        }

        case 'categoria':
        case 'proveedor':
        case 'unidad':
          datos[campo] = valorRaw != null ? String(valorRaw).trim() : null;
          break;
      }
    }

    return {
      filaOriginal: index + 1,
      datos,
      errores,
      valida: errores.length === 0,
    };
  });
}


function parsearPrecio(valor: unknown): number | null {
  if (valor == null || String(valor).trim() === '') return null;
  const str = String(valor)
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(str);
  return Number.isNaN(num) ? null : Math.round(num * 100) / 100;
}

function parsearEntero(valor: unknown): number | null {
  if (valor == null || String(valor).trim() === '') return null;
  const num = parseInt(String(valor).replace(/\s/g, ''), 10);
  return Number.isNaN(num) ? null : num;
}

function parsearFecha(valor: string): string | null {
  const patrones = [
    /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/,
    /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/,
  ];

  const match1 = valor.match(patrones[0]);
  if (match1) {
    const [, d, m, y] = match1;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const match2 = valor.match(patrones[1]);
  if (match2) {
    const [, y, m, d] = match2;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = new Date(valor);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}
