'use client';

import { AlertCircle, Check, X } from 'lucide-react';

import { type CampoProducto } from '@/lib/normalizador/aliases';
import { type MapeoColumna } from '@/lib/normalizador/mapear';

const CAMPOS_DISPONIBLES: { value: CampoProducto | 'ignorar'; label: string }[] = [
  { value: 'codigo', label: 'Código' },
  { value: 'nombre', label: 'Nombre / Descripción' },
  { value: 'precio_costo', label: 'Precio de costo' },
  { value: 'precio_venta', label: 'Precio de venta' },
  { value: 'stock_actual', label: 'Stock actual' },
  { value: 'stock_minimo', label: 'Stock mínimo' },
  { value: 'categoria', label: 'Categoría' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'fecha_vencimiento', label: 'Fecha de vencimiento' },
  { value: 'unidad', label: 'Unidad de medida' },
  { value: 'ignorar', label: '— Ignorar columna —' },
];

const CONFIANZA_ICON = {
  exacta: <Check className="h-4 w-4 text-green-600" />,
  parcial: <AlertCircle className="h-4 w-4 text-amber-600" />,
  ninguna: <X className="h-4 w-4 text-red-600" />,
};

interface Props {
  mapeo: MapeoColumna[];
  onMapeoChange: (mapeo: MapeoColumna[]) => void;
  onConfirmar: () => void;
  filasMuestra: Record<string, string | number | null>[];
}

export function MapeoColumnas({ mapeo, onMapeoChange, onConfirmar, filasMuestra }: Props) {
  function handleCambio(index: number, campo: CampoProducto | 'ignorar') {
    const nuevoMapeo = [...mapeo];
    if (campo !== 'ignorar') {
      nuevoMapeo.forEach((m, i) => {
        if (i !== index && m.campoDetectado === campo && !m.ignorar) {
          nuevoMapeo[i] = {
            ...nuevoMapeo[i],
            campoDetectado: null,
            ignorar: true,
            confianza: 'ninguna',
          };
        }
      });
    }
    if (campo === 'ignorar') {
      nuevoMapeo[index] = { ...nuevoMapeo[index], campoDetectado: null, ignorar: true };
    } else {
      nuevoMapeo[index] = { ...nuevoMapeo[index], campoDetectado: campo, ignorar: false };
    }
    onMapeoChange(nuevoMapeo);
  }

  const tieneNombre = mapeo.some((m) => m.campoDetectado === 'nombre');

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Mapeo de columnas</h2>
      <p className="text-sm text-muted-foreground">
        Verificá que cada columna del archivo esté asociada al campo correcto del sistema.
      </p>

      <div className="space-y-3">
        {mapeo.map((col, i) => (
          <div key={`${col.headerOriginal}-${i}`} className="flex items-center gap-4 rounded-lg border p-3">
            <div className="flex w-1/3 items-center gap-2">
              {CONFIANZA_ICON[col.confianza]}
              <span className="font-mono text-sm">{col.headerOriginal}</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <select
              value={col.ignorar ? 'ignorar' : (col.campoDetectado ?? 'ignorar')}
              onChange={(e) => handleCambio(i, e.target.value as CampoProducto | 'ignorar')}
              className="flex-1 rounded border px-3 py-2 text-sm"
            >
              {CAMPOS_DISPONIBLES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="w-1/4 truncate text-xs text-muted-foreground">
              Ej: {String(filasMuestra[0]?.[col.headerOriginal] ?? '—')}
            </div>
          </div>
        ))}
      </div>

      {!tieneNombre ? (
        <p className="text-sm text-red-600">
          El campo &quot;Nombre&quot; es obligatorio. Asigná una columna al nombre del producto.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onConfirmar}
        disabled={!tieneNombre}
        className="rounded bg-primary px-6 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        Continuar al preview
      </button>
    </div>
  );
}
