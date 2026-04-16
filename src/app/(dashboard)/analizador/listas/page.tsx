'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { formatCurrency } from '@/lib/utils/formatters';

type Lista = {
  id: string;
  nombre_archivo: string;
  estado: string;
  fecha_recepcion: string;
  total_items: number;
  variacion_promedio_pct: number | null;
  margen_global_anterior_pct: number | null;
  margen_global_nuevo_pct: number | null;
  items_con_aumento: number;
  items_con_baja: number;
  proveedor: { id: string; nombre: string } | null;
};

const ESTADO_BADGES: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800' },
  analizada: { label: 'Analizada', cls: 'bg-blue-100 text-blue-800' },
  aplicada_total: { label: 'Aplicada', cls: 'bg-green-100 text-green-800' },
  aplicada_parcial: { label: 'Parcial', cls: 'bg-emerald-100 text-emerald-800' },
  archivada: { label: 'Archivada', cls: 'bg-gray-100 text-gray-600' },
  error: { label: 'Error', cls: 'bg-red-100 text-red-800' },
};

export default function ListasPage() {
  const { canEdit } = useDashboardRole();
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado) params.set('estado', filtroEstado);
    const res = await fetch(`/api/analizador/listas?${params}`);
    if (res.ok) {
      const json = (await res.json()) as { listas: Lista[] };
      setListas(json.listas ?? []);
    }
    setLoading(false);
  }, [filtroEstado]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Listas de precios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cargá, analizá y aplicá listas de proveedores.
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/analizador/listas/nueva"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nueva lista
          </Link>
        ) : null}
      </div>

      <div className="flex gap-2">
        {['', 'pendiente', 'analizada', 'aplicada_total', 'aplicada_parcial', 'archivada'].map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filtroEstado === e
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {e === '' ? 'Todas' : ESTADO_BADGES[e]?.label ?? e}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Cargando...</div>
      ) : listas.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No hay listas de precios todavía.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Archivo</th>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Items</th>
                <th className="px-4 py-3 text-right font-medium">Var. %</th>
                <th className="px-4 py-3 text-right font-medium">Margen ant.</th>
                <th className="px-4 py-3 text-right font-medium">Margen nuevo</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {listas.map((l) => {
                const badge = ESTADO_BADGES[l.estado] ?? { label: l.estado, cls: 'bg-gray-100' };
                return (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/analizador/listas/${l.id}`} className="font-medium hover:underline">
                        {l.nombre_archivo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.proveedor?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{l.total_items}</td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      (l.variacion_promedio_pct ?? 0) > 0 ? 'text-red-600' : (l.variacion_promedio_pct ?? 0) < 0 ? 'text-green-600' : ''
                    }`}>
                      {l.variacion_promedio_pct != null ? `${l.variacion_promedio_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {l.margen_global_anterior_pct != null ? `${l.margen_global_anterior_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {l.margen_global_nuevo_pct != null ? `${l.margen_global_nuevo_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(l.fecha_recepcion).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
