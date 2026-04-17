'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  FileText,
  Minus,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopProducto {
  producto_id: string;
  producto_nombre: string;
  ingresos: number;
  margen_bruto: number;
  unidades: number;
}

interface CategoriaResumen {
  categoria_id: string;
  categoria_nombre: string;
  ingresos: number;
  costos: number;
  margen_bruto: number;
  margen_pct: number;
}

interface CierreActual {
  periodo: string;
  ingresos_brutos: number;
  costo_mercaderia: number;
  margen_bruto: number;
  margen_bruto_pct: number | null;
  unidades_vendidas: number;
  comprobantes_emitidos: number;
  ticket_promedio: number | null;
  top_productos: TopProducto[];
  por_categoria: CategoriaResumen[];
}

interface EvolucionItem {
  periodo: string;
  ingresos: number;
  costos: number;
  margen_bruto: number;
  margen_pct: number;
}

interface TopCliente {
  cliente_id: string;
  cliente_nombre: string;
  total: number;
}

interface DashboardData {
  cierre_actual: CierreActual | null;
  evolucion: EvolucionItem[];
  listas_pendientes: number;
  top_clientes: TopCliente[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof DollarSign;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {trend && trend !== 'neutral' && (
          <span className={cn('flex items-center text-xs font-medium', trend === 'up' ? 'text-emerald-600' : 'text-red-600')}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function periodoLabel(p: string): string {
  const [y, m] = p.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${meses[Number(m) - 1]} ${y.slice(2)}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DashboardRentabilidad() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/analizador/cierre');
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Error al cargar datos');
          return;
        }
        setData(json as DashboardData);
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const c = data.cierre_actual;
  const ev = data.evolucion;
  const prevMonth = ev.length >= 2 ? ev[ev.length - 2] : null;
  const currentIngresos = c?.ingresos_brutos ?? 0;
  const ingresosTrend = prevMonth && prevMonth.ingresos > 0
    ? (currentIngresos > prevMonth.ingresos ? 'up' : currentIngresos < prevMonth.ingresos ? 'down' : 'neutral')
    : 'neutral';
  const margenTrend = prevMonth && prevMonth.margen_pct > 0
    ? ((c?.margen_bruto_pct ?? 0) > prevMonth.margen_pct ? 'up' : (c?.margen_bruto_pct ?? 0) < prevMonth.margen_pct ? 'down' : 'neutral')
    : 'neutral';

  const chartData = ev.map((e) => ({
    name: periodoLabel(e.periodo),
    ingresos: e.ingresos,
    costos: e.costos,
    margen: e.margen_pct,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ventas del mes"
          value={formatCurrency(c?.ingresos_brutos ?? 0)}
          icon={DollarSign}
          trend={ingresosTrend as 'up' | 'down' | 'neutral'}
          subtitle={`${c?.comprobantes_emitidos ?? 0} comprobantes`}
        />
        <MetricCard
          title="Costos"
          value={formatCurrency(c?.costo_mercaderia ?? 0)}
          icon={Package}
        />
        <MetricCard
          title="Margen bruto"
          value={formatCurrency(c?.margen_bruto ?? 0)}
          icon={TrendingUp}
          trend={margenTrend as 'up' | 'down' | 'neutral'}
          subtitle={c?.margen_bruto_pct != null ? `${c.margen_bruto_pct.toFixed(1)}%` : undefined}
        />
        <MetricCard
          title="Ticket promedio"
          value={c?.ticket_promedio != null ? formatCurrency(c.ticket_promedio) : '—'}
          icon={FileText}
          subtitle={`${c?.unidades_vendidas ?? 0} unidades vendidas`}
        />
      </div>

      {/* Margin Evolution Chart */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          Evolución del margen — últimos 6 meses
        </h3>
        {chartData.some((d) => d.ingresos > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMargen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => [
                  name === 'margen' ? `${Number(value).toFixed(1)}%` : formatCurrency(Number(value)),
                  name === 'ingresos' ? 'Ingresos' : name === 'costos' ? 'Costos' : 'Margen %',
                ]}
              />
              <Area
                type="monotone"
                dataKey="ingresos"
                stroke="hsl(var(--primary))"
                fill="url(#colorIngresos)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="costos"
                stroke="#f59e0b"
                fill="none"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No hay datos de ventas en los últimos 6 meses.
          </p>
        )}
      </div>

      {/* Three-column bottom section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Top products */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BarChart3 className="h-4 w-4" /> Top productos
          </h3>
          {(c?.top_productos ?? []).length > 0 ? (
            <ul className="space-y-2 text-sm">
              {c!.top_productos.slice(0, 5).map((p) => (
                <li key={p.producto_id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.producto_nombre}</span>
                  <span className="shrink-0 font-mono text-xs">{formatCurrency(p.ingresos)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Sin datos</p>
          )}
        </div>

        {/* Categories */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Package className="h-4 w-4" /> Por categoría
          </h3>
          {(c?.por_categoria ?? []).length > 0 ? (
            <ul className="space-y-2 text-sm">
              {c!.por_categoria.slice(0, 5).map((cat) => (
                <li key={cat.categoria_id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{cat.categoria_nombre}</span>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    cat.margen_pct >= 30 ? 'bg-emerald-100 text-emerald-800' :
                    cat.margen_pct >= 15 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  )}>
                    {cat.margen_pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Sin datos</p>
          )}
        </div>

        {/* Top clients + pending lists */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" /> Top clientes
          </h3>
          {data.top_clientes.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {data.top_clientes.slice(0, 5).map((cl) => (
                <li key={cl.cliente_id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{cl.cliente_nombre}</span>
                  <span className="shrink-0 font-mono text-xs">{formatCurrency(cl.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Sin clientes este mes</p>
          )}

          {data.listas_pendientes > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-900">
                {data.listas_pendientes} lista{data.listas_pendientes > 1 ? 's' : ''} pendiente{data.listas_pendientes > 1 ? 's' : ''} de analizar o aplicar
              </p>
              <Link href="/analizador/listas" className="mt-1 block text-xs text-amber-700 underline underline-offset-2">
                Ver listas →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
