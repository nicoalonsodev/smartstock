'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type ProductoStockBajo = {
  id: string;
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  proveedor: { nombre: string } | null;
};

export function StockBajoCard() {
  const [productos, setProductos] = useState<ProductoStockBajo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/alertas/stock-bajo');
      const json = await res.json();
      setProductos(json.productos ?? []);
      setLoading(false);
    }
    void fetchData();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-48 rounded-xl border bg-card" />;
  }
  if (productos.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
        <h3 className="font-semibold text-amber-900">
          Stock bajo ({productos.length} producto{productos.length !== 1 ? 's' : ''})
        </h3>
      </div>
      <ul className="space-y-2">
        {productos.slice(0, 5).map((p) => (
          <li key={p.id} className="flex justify-between text-sm">
            <Link href={`/productos/${p.id}`} className="text-amber-800 hover:underline">
              {p.nombre}
            </Link>
            <span className="font-mono text-amber-600">
              {p.stock_actual} / {p.stock_minimo}
            </span>
          </li>
        ))}
      </ul>
      {productos.length > 5 ? (
        <Link
          href="/productos?stock_bajo=true"
          className="mt-2 block text-sm text-amber-700 hover:underline"
        >
          Ver todos ({productos.length})
        </Link>
      ) : null}
    </div>
  );
}
