'use client';

import Link from 'next/link';

import { formatCurrency, formatDate } from '@/lib/utils/formatters';

export type PedidoTabla = {
  id: string;
  estado: string;
  fecha: string;
  total: number;
  cliente: { nombre: string; razon_social: string | null } | null;
  usuario: { nombre: string; apellido: string } | null;
  items: { id: string }[];
};

const ESTADO_STYLES: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  confirmado: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  entregado: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export function PedidosTable({ pedidos }: { pedidos: PedidoTabla[] }) {
  if (pedidos.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        No hay pedidos con los filtros actuales.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Pedido</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Items</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="px-4 py-3">
                <Link href={`/pedidos/${p.id}`} className="font-mono text-xs hover:underline">
                  #{p.id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-4 py-3">
                {p.cliente?.razon_social || p.cliente?.nombre || '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(p.fecha)}</td>
              <td className="px-4 py-3">{p.items?.length ?? 0}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.total)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_STYLES[p.estado] ?? 'bg-muted'}`}
                >
                  {ESTADO_LABELS[p.estado] ?? p.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
