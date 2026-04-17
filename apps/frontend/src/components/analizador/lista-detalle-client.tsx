'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Brain,
  CheckCircle,
  Loader2,
  Minus,
  Play,
  Save,
  Sparkles,
} from 'lucide-react';

import { formatCurrency } from '@/lib/utils/formatters';
import type { ModoSimulacion } from '@/lib/analizador/simulador';
import { simularPrecios, type ItemSimulable, type SimulacionCompleta } from '@/lib/analizador/simulador';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Lista = {
  id: string;
  nombre_archivo: string;
  estado: string;
  total_items: number;
  variacion_promedio_pct: number | null;
  margen_global_anterior_pct: number | null;
  margen_global_nuevo_pct: number | null;
  items_con_aumento: number;
  items_con_baja: number;
  items_sin_cambio: number;
  items_matcheados_seguros: number;
  items_matcheados_dudosos: number;
  items_sin_match: number;
  resumen_ia: ReporteIA | null;
  proveedor?: { id: string; nombre: string } | null;
};

type Item = {
  id: string;
  nombre_raw: string;
  codigo_proveedor: string | null;
  precio_lista: number;
  precio_costo_anterior: number | null;
  variacion_pct: number | null;
  precio_venta_actual: number | null;
  margen_anterior_pct: number | null;
  margen_nuevo_pct: number | null;
  precio_venta_sugerido: number | null;
  precio_venta_decidido: number | null;
  match_confidence: number | null;
  match_metodo: string | null;
  producto_id: string | null;
  incluir_en_aplicacion: boolean;
};

type ReporteIA = {
  resumen?: string;
  observaciones?: string[];
  recomendaciones?: string[];
  alertas?: string[];
};

type MatchingResult = {
  resumen: { total: number; seguros: number; dudosos: number; sin_match: number };
};

type AnalisisResult = {
  metricas_globales: {
    variacion_promedio_pct: number;
    margen_global_anterior_pct: number;
    margen_global_nuevo_pct: number;
    items_con_aumento: number;
    items_con_baja: number;
    items_sin_cambio: number;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function margenColor(pct: number | null): string {
  if (pct == null) return '';
  if (pct >= 25) return 'text-green-600';
  if (pct >= 10) return 'text-yellow-600';
  return 'text-red-600';
}

function varColor(pct: number | null): string {
  if (pct == null) return '';
  if (pct > 0.01) return 'text-red-600';
  if (pct < -0.01) return 'text-green-600';
  return '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ListaDetalleClient({
  listaId,
  canEdit,
}: {
  listaId: string;
  canEdit: boolean;
}) {
  const [lista, setLista] = useState<Lista | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Simulator state
  const [modo, setModo] = useState<ModoSimulacion>('mantener_margen');
  const [parametro, setParametro] = useState(30);
  const [simulacion, setSimulacion] = useState<SimulacionCompleta | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/analizador/listas/${listaId}`);
    if (res.ok) {
      const json = (await res.json()) as { lista: Lista; items: Item[] };
      setLista(json.lista);
      setItems(json.items);
    }
    setLoading(false);
  }, [listaId]);

  useEffect(() => { void load(); }, [load]);

  // Run simulation whenever items/modo/parametro change
  useEffect(() => {
    if (items.length === 0) return;
    const simulables: ItemSimulable[] = items
      .filter((i) => i.producto_id != null)
      .map((i) => ({
        id: i.id,
        nombre_raw: i.nombre_raw,
        precio_lista: i.precio_lista,
        precio_costo_anterior: i.precio_costo_anterior,
        precio_venta_actual: i.precio_venta_actual,
        margen_anterior_pct: i.margen_anterior_pct,
        precio_venta_sugerido: i.precio_venta_sugerido,
        precio_venta_decidido: i.precio_venta_decidido,
        incluir_en_aplicacion: i.incluir_en_aplicacion,
      }));
    if (simulables.length > 0) {
      setSimulacion(simularPrecios(simulables, modo, parametro));
    }
  }, [items, modo, parametro]);

  const runAction = useCallback(
    async (action: string, method = 'POST', body?: unknown) => {
      setActionLoading(action);
      setMessage(null);
      try {
        const res = await fetch(`/api/analizador/listas/${listaId}/${action}`, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          setMessage({ type: 'err', text: (json.error as string) ?? 'Error' });
        } else {
          setMessage({ type: 'ok', text: `${action} completado` });
          await load();
        }
      } catch {
        setMessage({ type: 'err', text: 'Error de conexión' });
      } finally {
        setActionLoading(null);
      }
    },
    [listaId, load],
  );

  const guardarPrecios = useCallback(async () => {
    if (!simulacion) return;
    setActionLoading('guardar');
    const payload = simulacion.items.map((i) => ({
      item_id: i.id,
      precio_venta_decidido: i.precio_venta_simulado,
    }));
    const res = await fetch(`/api/analizador/listas/${listaId}/simular`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
    });
    if (res.ok) {
      setMessage({ type: 'ok', text: 'Precios guardados' });
      await load();
    } else {
      setMessage({ type: 'err', text: 'Error al guardar precios' });
    }
    setActionLoading(null);
  }, [simulacion, listaId, load]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!lista) {
    return <div className="py-20 text-center text-muted-foreground">Lista no encontrada</div>;
  }

  const ia = lista.resumen_ia;
  const esAnalizada = lista.estado !== 'pendiente';
  const esAplicada = lista.estado.startsWith('aplicada');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{lista.nombre_archivo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proveedor: {(lista.proveedor as { nombre: string } | null)?.nombre ?? '—'} · {lista.total_items} items
        </p>
      </div>

      {message ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      ) : null}

      {/* Action buttons */}
      {canEdit && !esAplicada ? (
        <div className="flex flex-wrap gap-2">
          {lista.estado === 'pendiente' ? (
            <>
              <button disabled={!!actionLoading} onClick={() => runAction('matching')} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {actionLoading === 'matching' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Ejecutar Matching
              </button>
              <button disabled={!!actionLoading} onClick={() => runAction('analisis')} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {actionLoading === 'analisis' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                Analizar
              </button>
            </>
          ) : null}
          {esAnalizada ? (
            <>
              <button disabled={!!actionLoading} onClick={() => runAction('reporte')} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {actionLoading === 'reporte' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Reporte IA
              </button>
              <button disabled={!!actionLoading} onClick={() => guardarPrecios()} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
                {actionLoading === 'guardar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar precios simulados
              </button>
              <button disabled={!!actionLoading} onClick={() => runAction('aplicar', 'POST', { contribuir_radar: true })} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {actionLoading === 'aplicar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Aplicar lista
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Metric cards */}
      {esAnalizada ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard label="Variación promedio" value={`${lista.variacion_promedio_pct?.toFixed(1) ?? '—'}%`} color={varColor(lista.variacion_promedio_pct)} />
          <MetricCard label="Margen anterior" value={`${lista.margen_global_anterior_pct?.toFixed(1) ?? '—'}%`} color={margenColor(lista.margen_global_anterior_pct)} />
          <MetricCard label="Margen nuevo" value={`${lista.margen_global_nuevo_pct?.toFixed(1) ?? '—'}%`} color={margenColor(lista.margen_global_nuevo_pct)} />
          <MetricCard label="Matching" value={`${lista.items_matcheados_seguros} seguros / ${lista.items_matcheados_dudosos} dudosos / ${lista.items_sin_match} nuevos`} />
        </div>
      ) : null}

      {esAnalizada ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
            <ArrowUp className="h-5 w-5 text-red-500" />
            <div><div className="text-lg font-bold">{lista.items_con_aumento}</div><div className="text-xs text-muted-foreground">Con aumento</div></div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
            <ArrowDown className="h-5 w-5 text-green-500" />
            <div><div className="text-lg font-bold">{lista.items_con_baja}</div><div className="text-xs text-muted-foreground">Con baja</div></div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
            <Minus className="h-5 w-5 text-gray-400" />
            <div><div className="text-lg font-bold">{lista.items_sin_cambio}</div><div className="text-xs text-muted-foreground">Sin cambio</div></div>
          </div>
        </div>
      ) : null}

      {/* IA Summary */}
      {ia ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Brain className="h-4 w-4" /> Resumen IA</h2>
          {ia.resumen ? <p className="text-sm">{ia.resumen}</p> : null}
          {ia.alertas && ia.alertas.length > 0 ? (
            <div>
              <h3 className="text-xs font-medium text-red-600 uppercase">Alertas</h3>
              <ul className="mt-1 list-inside list-disc text-sm">{ia.alertas.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>
          ) : null}
          {ia.recomendaciones && ia.recomendaciones.length > 0 ? (
            <div>
              <h3 className="text-xs font-medium text-blue-600 uppercase">Recomendaciones</h3>
              <ul className="mt-1 list-inside list-disc text-sm">{ia.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          ) : null}
          {ia.observaciones && ia.observaciones.length > 0 ? (
            <div>
              <h3 className="text-xs font-medium text-gray-600 uppercase">Observaciones</h3>
              <ul className="mt-1 list-inside list-disc text-sm">{ia.observaciones.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Simulator controls */}
      {esAnalizada && !esAplicada ? (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Estrategia</label>
            <select className="rounded border px-3 py-2 text-sm" value={modo} onChange={(e) => setModo(e.target.value as ModoSimulacion)}>
              <option value="mantener_margen">Mantener margen</option>
              <option value="margen_fijo">Margen fijo</option>
              <option value="aumento_fijo">Aumento fijo %</option>
              <option value="piso_margen">Piso de margen</option>
              <option value="manual">Manual / sugerido</option>
            </select>
          </div>
          {(modo === 'margen_fijo' || modo === 'aumento_fijo' || modo === 'piso_margen') ? (
            <div>
              <label className="mb-1 block text-xs font-medium">Valor %</label>
              <input type="number" className="w-24 rounded border px-3 py-2 text-sm" value={parametro} onChange={(e) => setParametro(Number(e.target.value))} />
            </div>
          ) : null}
          {simulacion ? (
            <div className="flex gap-6 text-sm">
              <span>Margen sim: <strong className={margenColor(simulacion.resumen.margen_global_simulado_pct)}>{simulacion.resumen.margen_global_simulado_pct.toFixed(1)}%</strong></span>
              <span>Aumento prom: <strong>{simulacion.resumen.aumento_promedio_publico_pct.toFixed(1)}%</strong></span>
              <span>Margen bajo: <strong className={simulacion.resumen.items_margen_bajo > 0 ? 'text-red-600' : ''}>{simulacion.resumen.items_margen_bajo}</strong></span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Items table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-3 font-medium">Producto</th>
              <th className="px-3 py-3 font-medium">Código</th>
              <th className="px-3 py-3 text-right font-medium">Precio lista</th>
              {esAnalizada ? (
                <>
                  <th className="px-3 py-3 text-right font-medium">Costo ant.</th>
                  <th className="px-3 py-3 text-right font-medium">Var. %</th>
                  <th className="px-3 py-3 text-right font-medium">Margen ant.</th>
                  <th className="px-3 py-3 text-right font-medium">Margen nuevo</th>
                  <th className="px-3 py-3 text-right font-medium">Sugerido</th>
                </>
              ) : null}
              <th className="px-3 py-3 text-center font-medium">Match</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-3 py-2 max-w-[200px] truncate">{item.nombre_raw}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.codigo_proveedor ?? '—'}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.precio_lista)}</td>
                {esAnalizada ? (
                  <>
                    <td className="px-3 py-2 text-right text-muted-foreground">{item.precio_costo_anterior != null ? formatCurrency(item.precio_costo_anterior) : '—'}</td>
                    <td className={`px-3 py-2 text-right font-mono ${varColor(item.variacion_pct)}`}>{item.variacion_pct != null ? `${item.variacion_pct.toFixed(1)}%` : '—'}</td>
                    <td className={`px-3 py-2 text-right font-mono ${margenColor(item.margen_anterior_pct)}`}>{item.margen_anterior_pct != null ? `${item.margen_anterior_pct.toFixed(1)}%` : '—'}</td>
                    <td className={`px-3 py-2 text-right font-mono ${margenColor(item.margen_nuevo_pct)}`}>{item.margen_nuevo_pct != null ? `${item.margen_nuevo_pct.toFixed(1)}%` : '—'}</td>
                    <td className="px-3 py-2 text-right">{item.precio_venta_sugerido != null ? formatCurrency(item.precio_venta_sugerido) : '—'}</td>
                  </>
                ) : null}
                <td className="px-3 py-2 text-center">
                  {item.match_confidence != null ? (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.match_confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                      item.match_confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(item.match_confidence * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color ?? ''}`}>{value}</div>
    </div>
  );
}
