'use client';

import { AlertCircle, Check, Package, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Props {
  resultado: {
    total_filas: number;
    productos_creados: number;
    productos_actualizados: number;
    filas_con_error: number;
    detalle_errores: { fila: number; campo: string; error: string }[];
    duplicadas_descartadas?: number;
  };
}

export function ResumenImportacion({ resultado }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Check className="h-5 w-5 text-green-600" />
        Importación completada
      </h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{resultado.total_filas}</p>
          <p className="text-sm text-muted-foreground">Total filas</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{resultado.productos_creados}</p>
          <p className="text-sm text-muted-foreground">Creados</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{resultado.productos_actualizados}</p>
          <p className="text-sm text-muted-foreground">Actualizados</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{resultado.filas_con_error}</p>
          <p className="text-sm text-muted-foreground">Errores</p>
        </div>
      </div>

      {resultado.duplicadas_descartadas != null && resultado.duplicadas_descartadas > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Se descartaron {resultado.duplicadas_descartadas} fila
          {resultado.duplicadas_descartadas !== 1 ? 's' : ''} duplicada
          {resultado.duplicadas_descartadas !== 1 ? 's' : ''} por código repetido (se conservó la
          última).
        </p>
      ) : null}

      {resultado.detalle_errores.length > 0 ? (
        <details className="rounded-lg border border-red-200 p-4 open:bg-red-50/50">
          <summary className="cursor-pointer list-none font-medium text-red-900 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Detalle de errores ({resultado.detalle_errores.length})
            </span>
          </summary>
          <ul className="mt-3 space-y-1 text-sm">
            {resultado.detalle_errores.map((err, i) => (
              <li key={i} className="text-red-700">
                Fila {err.fila}: {err.error}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/productos"
          className="inline-flex items-center rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Package className="mr-2 inline h-4 w-4" />
          Ver productos
        </Link>
        <Link href="/importar" className="inline-flex items-center rounded border px-4 py-2 text-sm">
          <RefreshCw className="mr-2 inline h-4 w-4" />
          Importar otro archivo
        </Link>
      </div>
    </div>
  );
}
