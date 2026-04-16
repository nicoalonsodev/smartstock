'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Loader2,
  Package,
  Truck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ForecastProducto {
  producto_id: string;
  producto_nombre: string;
  categoria_id: string | null;
  stock_actual: number;
  stock_minimo: number;
  consumo_diario: number;
  dias_restantes: number;
  fecha_agotamiento: string;
  fecha_sugerida_compra: string;
  cantidad_sugerida: number;
  costo_estimado: number;
  estacionalidad_detectada: boolean;
  indice_estacional: number;
  proveedor_sugerido: {
    proveedor_id: string;
    proveedor_nombre: string;
    precio_costo: number;
    score: number;
  } | null;
  urgencia: 'critica' | 'alta' | 'media' | 'baja';
}

interface ForecastOutput {
  productos: ForecastProducto[];
  costo_total_estimado: number;
  productos_criticos: number;
  productos_con_estacionalidad: number;
}

interface Categoria { id: string; nombre: string }
interface Proveedor { id: string; nombre: string }

// ---------------------------------------------------------------------------
// Urgency config
// ---------------------------------------------------------------------------

const URGENCIA_CONFIG: Record<string, { label: string; cls: string; icon: typeof AlertTriangle }> = {
  critica: { label: 'Crítica', cls: 'bg-red-100 text-red-800', icon: AlertTriangle },
  alta: { label: 'Alta', cls: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  media: { label: 'Media', cls: 'bg-yellow-100 text-yellow-800', icon: Package },
  baja: { label: 'Baja', cls: 'bg-emerald-100 text-emerald-800', icon: Package },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReposicionPage() {
  const [data, setData] = useState<ForecastOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoriaId, setCategoriaId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    void (async () => {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/categorias'),
        fetch('/api/proveedores'),
      ]);
      if (cRes.ok) {
        const j = await cRes.json();
        setCategorias(j.categorias ?? []);
      }
      if (pRes.ok) {
        const j = await pRes.json();
        setProveedores(j.proveedores ?? []);
      }
    })();
  }, []);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoriaId) params.set('categoria_id', categoriaId);
    if (proveedorId) params.set('proveedor_id', proveedorId);
    const res = await fetch(`/api/analizador/forecast?${params}`);
    if (res.ok) {
      const json = await res.json();
      setData(json as ForecastOutput);
    }
    setLoading(false);
  }, [categoriaId, proveedorId]);

  useEffect(() => { void loadForecast(); }, [loadForecast]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forecast de reposición</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proyección de compra ordenada por urgencia.
        </p>
      </div>

      {/* Header stats */}
      {data && !loading && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Costo total estimado</p>
              <p className="text-xl font-semibold">{formatCurrency(data.costo_total_estimado)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Críticos / urgentes</p>
              <p className="text-xl font-semibold">{data.productos_criticos}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <Package className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Con estacionalidad</p>
              <p className="text-xl font-semibold">{data.productos_con_estacionalidad}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando forecast...
        </div>
      ) : !data || data.productos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No hay productos con historial de consumo suficiente.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-3 font-medium">Urgencia</th>
                <th className="px-3 py-3 font-medium">Producto</th>
                <th className="px-3 py-3 text-right font-medium">Stock</th>
                <th className="px-3 py-3 text-right font-medium">Consumo/día</th>
                <th className="px-3 py-3 text-right font-medium">Días rest.</th>
                <th className="px-3 py-3 font-medium">Fecha sugerida</th>
                <th className="px-3 py-3 text-right font-medium">Cant. sugerida</th>
                <th className="px-3 py-3 font-medium">Proveedor</th>
                <th className="px-3 py-3 text-right font-medium">Costo est.</th>
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.productos.map((p) => {
                const urg = URGENCIA_CONFIG[p.urgencia] ?? URGENCIA_CONFIG.baja;
                return (
                  <tr key={p.producto_id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', urg.cls)}>
                        {urg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium">{p.producto_nombre}</span>
                      {p.estacionalidad_detectada && (
                        <span className="ml-1 text-[10px] text-blue-600" title={`Índice estacional: ${p.indice_estacional}`}>
                          ★ estacional
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {p.stock_actual}
                      <span className="text-xs text-muted-foreground"> / {p.stock_minimo}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{p.consumo_diario.toFixed(1)}</td>
                    <td className={cn(
                      'px-3 py-3 text-right font-mono',
                      p.dias_restantes <= 3 ? 'text-red-600 font-bold' :
                      p.dias_restantes <= 7 ? 'text-orange-600' : '',
                    )}>
                      {p.dias_restantes >= 9999 ? '∞' : Math.round(p.dias_restantes)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{formatDate(p.fecha_sugerida_compra)}</td>
                    <td className="px-3 py-3 text-right font-mono font-medium">{p.cantidad_sugerida}</td>
                    <td className="px-3 py-3">
                      {p.proveedor_sugerido ? (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{p.proveedor_sugerido.proveedor_nombre}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{formatCurrency(p.costo_estimado)}</td>
                    <td className="px-3 py-3 text-right">
                      <a
                        href={`/pedidos/nuevo?producto_id=${p.producto_id}&cantidad=${p.cantidad_sugerida}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Pedir <ArrowRight className="h-3 w-3" />
                      </a>
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
