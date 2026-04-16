'use client';

import { Clock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Estado = 'vencido' | 'critico' | 'proximo';

type ProductoVencimiento = {
  id: string;
  nombre: string;
  dias_restantes: number;
  estado: Estado;
};

const ESTADO_STYLES: Record<Estado, string> = {
  vencido: 'bg-red-100 text-red-800',
  critico: 'bg-orange-100 text-orange-800',
  proximo: 'bg-yellow-100 text-yellow-800',
};

const ESTADO_LABEL: Record<Estado, string> = {
  vencido: 'Vencido',
  critico: 'Esta semana',
  proximo: '30 días',
};

export function VencimientosCard() {
  const [productos, setProductos] = useState<ProductoVencimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/alertas/vencimientos');
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
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-red-600" aria-hidden />
        <h3 className="font-semibold text-red-900">Vencimientos ({productos.length})</h3>
      </div>
      <ul className="space-y-2">
        {productos.slice(0, 5).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <Link href={`/productos/${p.id}`} className="truncate text-red-800 hover:underline">
              {p.nombre}
            </Link>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${ESTADO_STYLES[p.estado]}`}
              title={ESTADO_LABEL[p.estado]}
            >
              {p.dias_restantes < 0
                ? `Hace ${Math.abs(p.dias_restantes)}d`
                : `${p.dias_restantes}d`}
            </span>
          </li>
        ))}
      </ul>
      {productos.length > 5 ? (
        <Link
          href="/productos?vencidos=true"
          className="mt-2 block text-sm text-red-700 hover:underline"
        >
          Ver todos ({productos.length})
        </Link>
      ) : null}
    </div>
  );
}
