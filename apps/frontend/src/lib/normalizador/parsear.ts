import * as XLSX from 'xlsx';

export interface ArchivoParseado {
  headers: string[];
  filas: Record<string, string | number | null>[];
  nombreArchivo: string;
  totalFilas: number;
}

function esCsv(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv');
}

function workbookAParseado(workbook: XLSX.WorkBook, nombreArchivo: string): ArchivoParseado {
  const primerNombre = workbook.SheetNames[0];
  if (!primerNombre) {
    throw new Error('El archivo está vacío o no tiene datos válidos');
  }

  const primerHoja = workbook.Sheets[primerNombre];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(primerHoja, {
    defval: null,
    raw: false,
  });

  if (jsonData.length === 0) {
    throw new Error('El archivo está vacío o no tiene datos válidos');
  }

  const headers = Object.keys(jsonData[0]).filter((h) => h != null && String(h).trim() !== '');
  if (headers.length === 0) {
    throw new Error('El archivo está vacío o no tiene datos válidos');
  }

  const filas = jsonData.map((row) => {
    const fila: Record<string, string | number | null> = {};
    for (const key of headers) {
      const val = row[key];
      fila[key] = val === undefined || val === '' ? null : (val as string | number);
    }
    return fila;
  });

  return {
    headers,
    filas,
    nombreArchivo,
    totalFilas: filas.length,
  };
}

/**
 * Los .csv leídos como `ArrayBuffer` en SheetJS suelen decodificarse como Latin-1,
 * lo que rompe tildes y eñes (p. ej. "Jabón" → "JabÃ³n"). Para CSV usamos UTF-8 explícito.
 */
export function parsearArchivo(file: File): Promise<ArchivoParseado> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let workbook: XLSX.WorkBook;
        if (esCsv(file)) {
          let text = e.target!.result as string;
          if (text.length > 0 && text.charCodeAt(0) === 0xfeff) {
            text = text.slice(1);
          }
          workbook = XLSX.read(text, { type: 'string' });
        } else {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          workbook = XLSX.read(data, { type: 'array' });
        }
        resolve(workbookAParseado(workbook, file.name));
      } catch {
        reject(
          new Error('No se pudo leer el archivo. Verificá que sea un .xlsx, .xls o .csv válido.')
        );
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    if (esCsv(file)) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
