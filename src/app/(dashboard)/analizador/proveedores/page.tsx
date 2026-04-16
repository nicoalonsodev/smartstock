'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Loader2,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProveedorScore {
  proveedor_id: string;
  proveedor_nombre: string;
  precio_promedio: number;
  variacion_promedio_pct: number;
  estabilidad_score: number;
  frecuencia_listas: number;
  score_total: number;
}

interface PerfilProveedor {
  proveedor_id: string;
  proveedor_nombre: string;
  total_listas: number;
  total_productos: number;
  historial: { fecha: string; variacion_promedio_pct: number | null; total_items: number }[];
  tendencia_pct: number | null;
  prediccion_proxima_pct: number | null;
  productos: { producto_id: string; producto_nombre: string; precio_costo: number }[];
}

interface RadarItem {
  rubro: string;
  proveedor_nombre: string;
  periodo: string;
  variacion_pct: number;
  cantidad_items: number;
  contribuciones: number;
}

interface Categoria { id: string; nombre: string }
interface Producto { id: string; nombre: string }

// ---------------------------------------------------------------------------
// Score badge
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 0.7
    ? 'bg-emerald-100 text-emerald-800'
    : score >= 0.4
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', color)}>
      {(score * 100).toFixed(0)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProveedoresPage() {
  const [scores, setScores] = useState<ProveedorScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [productoId, setProductoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Profile view
  const [perfil, setPerfil] = useState<PerfilProveedor | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  // Radar
  const [radar, setRadar] = useState<RadarItem[]>([]);
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    void (async () => {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/categorias'),
        fetch('/api/productos'),
      ]);
      if (cRes.ok) {
        const j = await cRes.json();
        setCategorias(j.categorias ?? []);
      }
      if (pRes.ok) {
        const j = await pRes.json();
        setProductos(j.productos ?? []);
      }
    })();
  }, []);

  const loadScores = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (productoId) params.set('producto_id', productoId);
    if (categoriaId) params.set('categoria_id', categoriaId);
    const res = await fetch(`/api/analizador/proveedores/comparar?${params}`);
    if (res.ok) {
      const json = (await res.json()) as { proveedores?: ProveedorScore[] };
      setScores(Array.isArray(json.proveedores) ? json.proveedores : []);
    }
    setLoading(false);
  }, [productoId, categoriaId]);

  useEffect(() => { void loadScores(); }, [loadScores]);

  async function openPerfil(proveedorId: string) {
    setLoadingPerfil(true);
    setPerfil(null);
    const res = await fetch(`/api/analizador/proveedores/${proveedorId}/perfil`);
    if (res.ok) {
      const json = await res.json();
      setPerfil(json as PerfilProveedor);
    }
    setLoadingPerfil(false);
  }

  async function toggleRadar() {
    if (showRadar) {
      setShowRadar(false);
      return;
    }
    const res = await fetch('/api/analizador/radar');
    if (res.ok) {
      const json = await res.json();
      setRadar(json.items ?? []);
    }
    setShowRadar(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comparación de proveedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Score ponderado por precio, estabilidad y transparencia.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void toggleRadar()}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm transition-colors',
              showRadar ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            Radar inflación
          </button>
          <Link
            href="/analizador/listas"
            className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            Ver listas →
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={productoId}
          onChange={(e) => { setProductoId(e.target.value); setCategoriaId(''); }}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todos los productos</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <select
          value={categoriaId}
          onChange={(e) => { setCategoriaId(e.target.value); setProductoId(''); }}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Score table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : scores.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No hay datos de proveedores con los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 text-right font-medium">Precio prom.</th>
                <th className="px-4 py-3 text-right font-medium">Var. prom. %</th>
                <th className="px-4 py-3 text-right font-medium">Estabilidad</th>
                <th className="px-4 py-3 text-right font-medium">Listas</th>
                <th className="px-4 py-3 text-right font-medium">Score</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={s.proveedor_id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{s.proveedor_nombre}</span>
                      {i === 0 && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">MEJOR</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.precio_promedio)}</td>
                  <td className={cn('px-4 py-3 text-right font-mono', s.variacion_promedio_pct > 0 ? 'text-red-600' : s.variacion_promedio_pct < 0 ? 'text-green-600' : '')}>
                    {s.variacion_promedio_pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ScoreBadge score={s.estabilidad_score} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{s.frecuencia_listas}</td>
                  <td className="px-4 py-3 text-right">
                    <ScoreBadge score={s.score_total} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void openPerfil(s.proveedor_id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver perfil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Profile panel */}
      {loadingPerfil && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando perfil...
        </div>
      )}
      {perfil && !loadingPerfil && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{perfil.proveedor_nombre}</h3>
            <button onClick={() => setPerfil(null)} className="text-xs text-muted-foreground hover:underline">
              Cerrar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Listas</p>
              <p className="text-2xl font-semibold">{perfil.total_listas}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Productos</p>
              <p className="text-2xl font-semibold">{perfil.total_productos}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Tendencia</p>
              <div className="flex items-center justify-center gap-1">
                {perfil.tendencia_pct != null ? (
                  <>
                    {perfil.tendencia_pct > 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    )}
                    <span className={cn('text-xl font-semibold', perfil.tendencia_pct > 0 ? 'text-red-600' : 'text-green-600')}>
                      {perfil.tendencia_pct.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-lg text-muted-foreground">—</span>
                )}
              </div>
              {perfil.prediccion_proxima_pct != null && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Predicción próx.: {perfil.prediccion_proxima_pct.toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          {/* Historial */}
          {perfil.historial.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Historial de listas</h4>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1">Fecha</th>
                      <th className="py-1 text-right">Items</th>
                      <th className="py-1 text-right">Variación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfil.historial.map((h, i) => (
                      <tr key={i} className="border-t border-muted/30">
                        <td className="py-1">{new Date(h.fecha).toLocaleDateString('es-AR')}</td>
                        <td className="py-1 text-right">{h.total_items}</td>
                        <td className={cn('py-1 text-right font-mono', (h.variacion_promedio_pct ?? 0) > 0 ? 'text-red-600' : 'text-green-600')}>
                          {h.variacion_promedio_pct != null ? `${h.variacion_promedio_pct.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Products */}
          {perfil.productos.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Productos ({perfil.productos.length})</h4>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {perfil.productos.slice(0, 20).map((p) => (
                      <tr key={p.producto_id} className="border-t border-muted/30">
                        <td className="py-1">{p.producto_nombre}</td>
                        <td className="py-1 text-right font-mono">{formatCurrency(p.precio_costo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Radar */}
      {showRadar && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" /> Radar de inflación (datos anonimizados)
          </h3>
          {radar.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay datos en el radar todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Rubro</th>
                    <th className="px-3 py-2 font-medium">Proveedor</th>
                    <th className="px-3 py-2 font-medium">Período</th>
                    <th className="px-3 py-2 text-right font-medium">Variación %</th>
                    <th className="px-3 py-2 text-right font-medium">Items</th>
                    <th className="px-3 py-2 text-right font-medium">Contrib.</th>
                  </tr>
                </thead>
                <tbody>
                  {radar.slice(0, 30).map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-3 py-2">{r.rubro}</td>
                      <td className="px-3 py-2">{r.proveedor_nombre}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.periodo}</td>
                      <td className={cn('px-3 py-2 text-right font-mono', r.variacion_pct > 0 ? 'text-red-600' : 'text-green-600')}>
                        {r.variacion_pct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right">{r.cantidad_items}</td>
                      <td className="px-3 py-2 text-right">{r.contribuciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
