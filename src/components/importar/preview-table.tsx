'use client';

import { AlertCircle, Check, X } from 'lucide-react';

import { type CampoProducto } from '@/lib/normalizador/aliases';
import { type FilaValidada } from '@/lib/normalizador/validar';

const CAMPO_LABELS: Record<CampoProducto, string> = {
  codigo: 'Código',
  nombre: 'Nombre',
  precio_costo: 'Costo',
  precio_venta: 'Venta',
  stock_actual: 'Stock',
  stock_minimo: 'Mínimo',
  categoria: 'Categoría',
  proveedor: 'Proveedor',
  fecha_vencimiento: 'Vencimiento',
  unidad: 'Unidad',
};

interface Props {
  filas: FilaValidada[];
  camposActivos: CampoProducto[];
  onFilaEdit: (index: number, campo: CampoProducto, valor: string | number | null) => void;
  onFilaDescartar: (index: number) => void;
  onConfirmar: () => void;
  loading: boolean;
}

export function PreviewTable({
  filas,
  camposActivos,
  onFilaEdit,
  onFilaDescartar,
  onConfirmar,
  loading,
}: Props) {
  const filasValidas = filas.filter((f) => f.valida);
  const filasConError = filas.filter((f) => !f.valida);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Preview de importación</h2>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <Check className="h-4 w-4" /> {filasValidas.length} válidas
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-4 w-4" /> {filasConError.length} con errores
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="w-12 px-3 py-2 text-left">#</th>
              {camposActivos.map((campo) => (
                <th key={campo} className="px-3 py-2 text-left">
                  {CAMPO_LABELS[campo]}
                </th>
              ))}
              <th className="w-20 px-3 py-2">Estado</th>
              <th className="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr
                key={`${fila.filaOriginal}-${i}`}
                className={`border-t ${!fila.valida ? 'bg-red-50' : 'hover:bg-muted/50'}`}
              >
                <td className="px-3 py-2 text-muted-foreground">{fila.filaOriginal}</td>
                {camposActivos.map((campo) => {
                  const tieneError = fila.errores.some((e) => e.campo === campo);
                  const msg = fila.errores.find((e) => e.campo === campo)?.mensaje;
                  return (
                    <td
                      key={campo}
                      className={`px-3 py-2 ${tieneError ? 'bg-red-100' : ''}`}
                      title={tieneError ? msg : undefined}
                    >
                      <input
                        type="text"
                        value={
                          fila.datos[campo] === null || fila.datos[campo] === undefined
                            ? ''
                            : String(fila.datos[campo])
                        }
                        onChange={(e) =>
                          onFilaEdit(i, campo, e.target.value === '' ? null : e.target.value)
                        }
                        className={`w-full border-b border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-primary ${
                          tieneError ? 'border-red-300 text-red-700' : ''
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center">
                  {fila.valida ? (
                    <Check className="mx-auto h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="mx-auto h-4 w-4 text-red-600" />
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onFilaDescartar(i)}
                    className="text-muted-foreground hover:text-red-600"
                    title="Descartar fila"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onConfirmar}
          disabled={loading || filasValidas.length === 0}
          className="rounded bg-primary px-6 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {loading
            ? 'Importando...'
            : `Importar ${filasValidas.length} producto${filasValidas.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
