'use client';

import Link from 'next/link';

import { formatCurrency } from '@/lib/utils/formatters';

export type ProductoTabla = {
  id: string;
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  precio_costo: number;
  precio_venta: number;
  unidad: string;
  categoria: { id: string; nombre: string } | null;
  proveedor: { id: string; nombre: string } | null;
  fecha_vencimiento?: string | null;
  comprometido?: number;
  disponible?: number;
};

export function ProductosTable({ productos }: { productos: ProductoTabla[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 text-right font-medium">Stock</th>
            <th className="px-4 py-3 text-right font-medium">Disponible</th>
            <th className="px-4 py-3 text-right font-medium">Costo</th>
            <th className="px-4 py-3 text-right font-medium">Venta</th>
            <th className="px-4 py-3 text-right font-medium">Margen</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => {
            const margen =
              p.precio_costo > 0
                ? (((p.precio_venta - p.precio_costo) / p.precio_costo) * 100).toFixed(1)
                : '—';
            const stockBajo = p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo;
            const disp = p.disponible ?? p.stock_actual;

            return (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                <td className="px-4 py-3">
                  <Link href={`/productos/${p.id}`} className="font-medium hover:underline">
                    {p.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.categoria?.nombre ?? '—'}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${stockBajo ? 'font-semibold text-amber-600' : ''}`}
                >
                  {p.stock_actual}
                  {p.unidad !== 'unidad' ? ` ${p.unidad}` : ''}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{disp}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.precio_costo)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.precio_venta)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{margen}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
