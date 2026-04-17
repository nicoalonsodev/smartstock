'use client';

import { useCallback, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';

interface Props {
  proveedorId: string;
  fechaDesde?: string;
  fechaHasta?: string;
  onSuccess: (lista: { id: string }) => void;
  disabled?: boolean;
}

const ACCEPT = '.xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp';

export function UploadLista({ proveedorId, fechaDesde, fechaHasta, onSuccess, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total_items: number; ia_usada: boolean } | null>(null);

  const procesarArchivo = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      setStats(null);

      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('proveedor_id', proveedorId);
      if (fechaDesde) formData.append('fecha_vigencia_desde', fechaDesde);
      if (fechaHasta) formData.append('fecha_vigencia_hasta', fechaHasta);

      try {
        const res = await fetch('/api/analizador/listas', {
          method: 'POST',
          body: formData,
        });

        const json = (await res.json()) as {
          error?: string;
          lista?: { id: string };
          total_items?: number;
          ia_usada?: boolean;
        };

        if (!res.ok) {
          setError(json.error ?? 'Error al procesar el archivo');
          return;
        }

        setStats({ total_items: json.total_items ?? 0, ia_usada: json.ia_usada ?? false });
        if (json.lista) onSuccess(json.lista);
      } catch {
        setError('Error de conexión. Intentá de nuevo.');
      } finally {
        setLoading(false);
      }
    },
    [proveedorId, fechaDesde, fechaHasta, onSuccess],
  );

  const blocked = disabled || loading || !proveedorId;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!blocked) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (blocked) return;
          const file = e.dataTransfer.files[0];
          if (file) void procesarArchivo(file);
        }}
        className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${blocked ? 'pointer-events-none opacity-50' : ''}`}
      >
        {loading ? (
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
        ) : (
          <FileUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        )}
        <p className="mb-1 text-base font-medium">
          {loading ? 'Procesando archivo...' : 'Arrastrá tu lista de precios acá'}
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          PDF, Excel, CSV, JPG, PNG o WebP (máx. 20 MB)
        </p>
        {!loading ? (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            Seleccionar archivo
            <input
              type="file"
              accept={ACCEPT}
              className="hidden"
              disabled={blocked}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void procesarArchivo(file);
              }}
            />
          </label>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {stats ? (
        <p className="text-sm text-green-700">
          Se extrajeron {stats.total_items} items{stats.ia_usada ? ' (con IA)' : ''}.
        </p>
      ) : null}
    </div>
  );
}
