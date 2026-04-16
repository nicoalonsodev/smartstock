'use client';

import { useCallback, useState } from 'react';
import { Brain, Loader2, Upload } from 'lucide-react';

interface ProductoExtraido {
  codigo: string | null;
  nombre: string;
  precio_venta: number | null;
  precio_costo: number | null;
  stock_actual: number | null;
  unidad: string | null;
  categoria: string | null;
}

interface Props {
  onExtraccionCompleta: (productos: ProductoExtraido[], archivoNombre: string) => void;
  onLimiteRefresh?: () => void;
  disabled?: boolean;
}

export function ExtraerPrecios({
  onExtraccionCompleta,
  onLimiteRefresh,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [stats, setStats] = useState<{ total_extraidos: number; total_validos: number } | null>(
    null,
  );

  const procesarArchivo = useCallback(
    async (file: File) => {
      setArchivo(file);
      setLoading(true);
      setError(null);
      setStats(null);

      const formData = new FormData();
      formData.append('archivo', file);

      try {
        const res = await fetch('/api/ia/extraer', {
          method: 'POST',
          body: formData,
        });

        const json = (await res.json()) as {
          error?: string;
          respuesta_raw?: string;
          total_extraidos?: number;
          total_validos?: number;
          productos?: ProductoExtraido[];
        };

        if (!res.ok) {
          setError(json.error || 'Error al procesar el archivo');
          return;
        }

        setStats({
          total_extraidos: json.total_extraidos ?? 0,
          total_validos: json.total_validos ?? 0,
        });

        onExtraccionCompleta(json.productos ?? [], file.name);
        onLimiteRefresh?.();
      } catch {
        setError('Error de conexión. Intentá de nuevo.');
      } finally {
        setLoading(false);
      }
    },
    [onExtraccionCompleta, onLimiteRefresh],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-purple-600" />
        <div>
          <h2 className="text-lg font-semibold">Extracción con IA</h2>
          <p className="text-sm text-muted-foreground">
            Subí un PDF o imagen de una lista de precios. La IA extraerá los productos automáticamente.
          </p>
        </div>
      </div>

      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          loading || disabled
            ? 'pointer-events-none border-purple-200 bg-purple-50 opacity-50'
            : 'border-muted-foreground/25'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
            <p className="text-sm text-purple-700">
              Analizando <span className="font-medium">{archivo?.name}</span> con Gemini…
            </p>
            <p className="text-xs text-muted-foreground">Esto puede tardar entre 5 y 30 segundos</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">
              Formatos: PDF, JPG, PNG, WebP (máx. 20 MB)
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700">
              <Brain className="h-4 w-4" />
              Seleccionar archivo
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                disabled={disabled}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void procesarArchivo(file);
                }}
              />
            </label>
          </>
        )}
      </div>

      {stats ? (
        <div className="rounded border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
          Extraídos {stats.total_extraidos} productos, {stats.total_validos} válidos. Revisá el preview
          antes de confirmar.
        </div>
      ) : null}

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
