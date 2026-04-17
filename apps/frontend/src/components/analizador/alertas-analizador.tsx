'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Package,
  TrendingDown,
  Truck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertaMargen {
  producto_id: string;
  producto_nombre: string;
  margen_actual_pct: number;
  margen_promedio_pct: number;
  caida_pct: number;
}

interface ForecastProducto {
  producto_id: string;
  producto_nombre: string;
  dias_restantes: number;
  urgencia: string;
  cantidad_sugerida: number;
  costo_estimado: number;
}

interface AlertaOportunidad {
  proveedor_id: string;
  proveedor_nombre: string;
  tipo: string;
  mensaje: string;
  dias_desde_ultima_lista: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AlertCard({
  title,
  icon: Icon,
  children,
  href,
  iconColor,
}: {
  title: string;
  icon: typeof AlertTriangle;
  children: React.ReactNode;
  href: string;
  iconColor?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className={cn('h-4 w-4', iconColor)} />
          {title}
        </h3>
        <Link href={href} className="text-xs text-primary hover:underline">
          Ver más →
        </Link>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AlertasAnalizador() {
  const [margenAlertas, setMargenAlertas] = useState<AlertaMargen[]>([]);
  const [forecast, setForecast] = useState<ForecastProducto[]>([]);
  const [oportunidades, setOportunidades] = useState<AlertaOportunidad[]>([]);
  const [listasPendientes, setListasPendientes] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [mRes, fRes, oRes, lRes] = await Promise.all([
          fetch('/api/analizador/margen'),
          fetch('/api/analizador/forecast'),
          fetch('/api/analizador/alertas/oportunidades'),
          fetch('/api/analizador/listas?estado=pendiente'),
        ]);

        if (mRes.ok) {
          const j = await mRes.json();
          setMargenAlertas(j.alertas?.slice(0, 3) ?? []);
        }
        if (fRes.ok) {
          const j = await fRes.json();
          setForecast(
            (j.productos ?? [])
              .filter((p: ForecastProducto) => p.urgencia === 'critica' || p.urgencia === 'alta')
              .slice(0, 3),
          );
        }
        if (oRes.ok) {
          const j = await oRes.json();
          setOportunidades(j.alertas?.slice(0, 3) ?? []);
        }
        if (lRes.ok) {
          const j = await lRes.json();
          setListasPendientes(j.listas?.length ?? 0);
        }
      } catch {
        // non-critical
      } finally {
        setLoaded(true);
      }
    }
    void load();
  }, []);

  if (!loaded) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border bg-card" />
        ))}
      </div>
    );
  }

  const hasAny = margenAlertas.length > 0 || forecast.length > 0 || oportunidades.length > 0 || listasPendientes > 0;
  if (!hasAny) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Margin drop alerts */}
      {margenAlertas.length > 0 && (
        <AlertCard title="Margen en caída" icon={TrendingDown} href="/analizador" iconColor="text-red-500">
          <ul className="space-y-2 text-sm">
            {margenAlertas.map((a) => (
              <li key={a.producto_id} className="flex items-center justify-between gap-2">
                <span className="truncate">{a.producto_nombre}</span>
                <span className="shrink-0 text-xs font-medium text-red-600">
                  {a.margen_actual_pct.toFixed(1)}% (↓{a.caida_pct.toFixed(1)}%)
                </span>
              </li>
            ))}
          </ul>
        </AlertCard>
      )}

      {/* Forecast urgency */}
      {forecast.length > 0 && (
        <AlertCard title="Reposición próxima" icon={Package} href="/analizador/reposicion" iconColor="text-orange-500">
          <ul className="space-y-2 text-sm">
            {forecast.map((f) => (
              <li key={f.producto_id} className="flex items-center justify-between gap-2">
                <span className="truncate">{f.producto_nombre}</span>
                <span className={cn(
                  'shrink-0 text-xs font-medium',
                  f.urgencia === 'critica' ? 'text-red-600' : 'text-orange-600',
                )}>
                  {Math.round(f.dias_restantes)}d — {formatCurrency(f.costo_estimado)}
                </span>
              </li>
            ))}
          </ul>
        </AlertCard>
      )}

      {/* Opportunity alerts */}
      {oportunidades.length > 0 && (
        <AlertCard title="Oportunidades" icon={Truck} href="/analizador/proveedores" iconColor="text-blue-500">
          <ul className="space-y-2 text-sm">
            {oportunidades.map((o) => (
              <li key={o.proveedor_id}>
                <span className="font-medium">{o.proveedor_nombre}</span>
                <p className="text-xs text-muted-foreground">{o.mensaje.slice(0, 100)}</p>
              </li>
            ))}
          </ul>
        </AlertCard>
      )}

      {/* Pending lists */}
      {listasPendientes > 0 && (
        <AlertCard title="Listas pendientes" icon={FileText} href="/analizador/listas" iconColor="text-amber-500">
          <p className="text-sm">
            <span className="font-semibold">{listasPendientes}</span> lista{listasPendientes > 1 ? 's' : ''} de precios sin analizar o aplicar.
          </p>
        </AlertCard>
      )}
    </div>
  );
}
