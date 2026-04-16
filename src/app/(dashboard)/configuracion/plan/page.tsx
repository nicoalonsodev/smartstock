'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { Button } from '@/components/ui/button';
import { notifyModulosRefresh } from '@/hooks/useModulos';
import type { ModulosConfig } from '@/lib/modulos/modulo-key';
import { cn } from '@/lib/utils';

const MODULO_LABELS: Record<keyof ModulosConfig, string> = {
  stock: 'Control de stock',
  importador_excel: 'Importador Excel/CSV',
  facturador_simple: 'Facturador simple (PDF)',
  facturador_arca: 'Facturación electrónica (ARCA)',
  pedidos: 'Pedidos',
  presupuestos: 'Presupuestos',
  ia_precios: 'IA de precios',
  analizador_rentabilidad: 'Analizador de rentabilidad',
};

type PlanState = 'base' | 'completo';

export default function PlanPage() {
  const { isAdmin } = useDashboardRole();
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [modulos, setModulos] = useState<ModulosConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/configuracion/plan');
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error al cargar');
      setPlan(null);
      setModulos(null);
    } else {
      setError(null);
      setPlan(json.plan === 'completo' ? 'completo' : 'base');
      if (json.modulos) {
        setModulos({
          stock: json.modulos.stock ?? true,
          importador_excel: json.modulos.importador_excel ?? true,
          facturador_simple: json.modulos.facturador_simple ?? false,
          facturador_arca: json.modulos.facturador_arca ?? false,
          pedidos: json.modulos.pedidos ?? false,
          presupuestos: json.modulos.presupuestos ?? false,
          ia_precios: json.modulos.ia_precios ?? false,
          analizador_rentabilidad: json.modulos.analizador_rentabilidad ?? false,
        });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cambiarPlan(destino: PlanState) {
    if (!isAdmin || destino === plan) return;
    setSaving(true);
    setError(null);
    const res = await fetch('/api/configuracion/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: destino }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? 'No se pudo actualizar el plan');
      return;
    }
    setPlan(json.plan ?? destino);
    notifyModulosRefresh();
    void load();
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl animate-pulse space-y-4 rounded-xl border bg-card p-8" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan y módulos</h1>
        <p className="mt-2 text-muted-foreground">
          Plan actual:{' '}
          <span className="font-medium text-foreground">
            {plan === 'completo' ? 'Completo' : 'Base'}
          </span>
          .
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          title="Plan Base"
          description="Stock, importación, pedidos e IA de precios. Sin facturación ARCA ni presupuestos (esos quedan en el plan completo)."
          highlight={plan === 'base'}
          acciones={
            isAdmin && plan === 'completo' ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void cambiarPlan('base')}
              >
                Cambiar a Plan Base
              </Button>
            ) : null
          }
        />
        <PlanCard
          title="Plan Completo"
          description="Agrega facturación electrónica ARCA, presupuestos y analizador de rentabilidad, además de todo lo del plan base (pedidos e IA)."
          highlight={plan === 'completo'}
          acciones={
            isAdmin && plan === 'base' ? (
              <Button type="button" disabled={saving} onClick={() => void cambiarPlan('completo')}>
                Cambiar a Plan Completo
              </Button>
            ) : null
          }
        />
      </div>

      {modulos ? (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium text-muted-foreground">Módulos activos ahora</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(MODULO_LABELS) as (keyof ModulosConfig)[]).map((key) => (
              <li
                key={key}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                  modulos[key] ? 'border-emerald-200 bg-emerald-50/80' : 'bg-muted/40 opacity-70'
                )}
              >
                <span>{MODULO_LABELS[key]}</span>
                <span className="font-medium tabular-nums">{modulos[key] ? 'Sí' : 'No'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!isAdmin ? (
        <p className="text-sm text-muted-foreground">
          Solo el administrador del negocio puede cambiar de plan. Consultá a quien gestione la cuenta.
        </p>
      ) : null}
    </div>
  );
}

function PlanCard({
  title,
  description,
  highlight,
  acciones,
}: {
  title: string;
  description: string;
  highlight: boolean;
  acciones: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-5 shadow-sm',
        highlight ? 'border-primary ring-1 ring-primary/20' : 'bg-card'
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{description}</p>
      {acciones ? <div className="mt-4">{acciones}</div> : null}
    </div>
  );
}
