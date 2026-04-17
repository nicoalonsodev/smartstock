import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'plantillas');
mkdirSync(outDir, { recursive: true });

const ws = XLSX.utils.aoa_to_sheet([
  [
    'Código',
    'Nombre',
    'Precio Costo',
    'Precio Venta',
    'Stock',
    'Stock Mínimo',
    'Categoría',
    'Unidad',
    'Vencimiento',
  ],
  ['ABC-001', 'Producto ejemplo', 100.5, 150, 50, 10, 'Almacén', 'unidad', '31/12/2026'],
]);

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Productos');

const outPath = join(outDir, 'plantilla_importacion.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Wrote', outPath);
