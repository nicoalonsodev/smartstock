'use client';

import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { formatCurrency } from '@/lib/utils/formatters';

export interface CambioPrecio {
  producto_id: string;
  codigo: string;
  nombre: string;
  precio_venta_anterior: number;
  precio_venta_nuevo: number;
  precio_costo_anterior: number | null;
  precio_costo_nuevo: number | null;
  variacion_porcentaje: number;
}

interface Props {
  cambios: CambioPrecio[];
}

export function PrecioCambioPreview({ cambios }: Props) {
  const subieron = cambios.filter((c) => c.variacion_porcentaje > 0);
  const bajaron = cambios.filter((c) => c.variacion_porcentaje < 0);
  const sinCambio = cambios.filter((c) => c.variacion_porcentaje === 0);

  const ordenados = [...cambios].sort(
    (a, b) => Math.abs(b.variacion_porcentaje) - Math.abs(a.variacion_porcentaje),
  );

  return (
    <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
      <h3 className="text-sm font-semibold text-amber-950">Cambios de precio (productos existentes)</h3>
      <p className="text-xs text-muted-foreground">
        Resumen antes de confirmar la importación. Rojo: subió · Verde: bajó · Gris: sin cambio en venta.
      </p>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1 text-red-600">
          <TrendingUp className="h-4 w-4" /> {subieron.length} subieron
        </span>
        <span className="flex items-center gap-1 text-green-600">
          <TrendingDown className="h-4 w-4" /> {bajaron.length} bajaron
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" /> {sinCambio.length} sin cambio
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left">Producto</th>
              <th className="px-3 py-2 text-right">Precio anterior</th>
              <th className="w-8 px-3 py-2 text-center" />
              <th className="px-3 py-2 text-right">Precio nuevo</th>
              <th className="px-3 py-2 text-right">Variación</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((c) => (
              <tr
                key={c.producto_id}
                className={`border-t ${
                  c.variacion_porcentaje > 0
                    ? 'bg-red-50/60'
                    : c.variacion_porcentaje < 0
                      ? 'bg-green-50/60'
                      : 'bg-muted/30'
                }`}
              >
                <td className="px-3 py-2">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{c.codigo}</span>
                  {c.nombre}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatCurrency(c.precio_venta_anterior)}
                </td>
                <td className="px-3 py-2 text-center">
                  <ArrowRight className="mx-auto h-4 w-4 text-muted-foreground" />
                </td>
                <td className="px-3 py-2 text-right font-mono font-medium">
                  {formatCurrency(c.precio_venta_nuevo)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono font-medium ${
                    c.variacion_porcentaje > 0
                      ? 'text-red-600'
                      : c.variacion_porcentaje < 0
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  {c.variacion_porcentaje > 0 ? '+' : ''}
                  {c.variacion_porcentaje.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
