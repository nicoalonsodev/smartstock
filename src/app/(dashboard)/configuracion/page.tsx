'use client';

import { useCallback, useEffect, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModulos } from '@/hooks/useModulos';

type TenantData = {
  id: string;
  nombre: string;
  razon_social: string | null;
  cuit: string | null;
  domicilio: string | null;
  telefono: string | null;
  email: string | null;
  condicion_iva: string | null;
  punto_de_venta: number;
  plan: string;
};

const CONDICION_IVA_LABELS: Record<string, string> = {
  responsable_inscripto: 'Responsable Inscripto',
  monotributista: 'Monotributista',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
};

type PosPrefs = {
  sonidos: boolean;
  anchoTicket: '80mm' | '57mm';
  stockBloqueante: boolean;
};

const POS_PREFS_KEY = 'smartstock_pos_prefs';

function loadPosPrefs(): PosPrefs {
  if (typeof window === 'undefined') return { sonidos: true, anchoTicket: '80mm', stockBloqueante: false };
  try {
    const raw = localStorage.getItem(POS_PREFS_KEY);
    if (raw) return JSON.parse(raw) as PosPrefs;
  } catch { /* ignore */ }
  return { sonidos: true, anchoTicket: '80mm', stockBloqueante: false };
}

function savePosPrefs(prefs: PosPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(POS_PREFS_KEY, JSON.stringify(prefs));
}

export default function ConfiguracionPage() {
  const { canEdit } = useDashboardRole();
  const { modulos } = useModulos();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [nombre, setNombre] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [cuit, setCuit] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [condicionIva, setCondicionIva] = useState('');
  const [puntoDeVenta, setPuntoDeVenta] = useState('1');

  // POS preferences (localStorage)
  const [posPrefs, setPosPrefs] = useState<PosPrefs>(loadPosPrefs);

  function updatePosPrefs(partial: Partial<PosPrefs>) {
    setPosPrefs((prev) => {
      const updated = { ...prev, ...partial };
      savePosPrefs(updated);
      return updated;
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/configuracion/tenant');
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error al cargar');
    } else {
      setError(null);
      setTenant(json);
      setNombre(json.nombre ?? '');
      setRazonSocial(json.razon_social ?? '');
      setCuit(json.cuit ?? '');
      setDomicilio(json.domicilio ?? '');
      setTelefono(json.telefono ?? '');
      setEmail(json.email ?? '');
      setCondicionIva(json.condicion_iva ?? '');
      setPuntoDeVenta(String(json.punto_de_venta ?? 1));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await fetch('/api/configuracion/tenant', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        razon_social: razonSocial || null,
        cuit: cuit || null,
        domicilio: domicilio || null,
        telefono: telefono || null,
        email: email || null,
        condicion_iva: condicionIva || null,
        punto_de_venta: parseInt(puntoDeVenta) || 1,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Error al guardar');
      return;
    }

    setEditMode(false);
    setSuccess(true);
    await load();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos fiscales de tu negocio. Se usan en la emisión de comprobantes.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-600">Datos guardados correctamente.</p>
      ) : null}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">Datos del negocio</h2>
          {canEdit && !editMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditMode(true);
                setSuccess(false);
              }}
            >
              Editar
            </Button>
          ) : null}
        </div>

        {editMode ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Nombre del negocio *</span>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Razón social</span>
              <Input
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">CUIT</span>
              <Input value={cuit} onChange={(e) => setCuit(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Condición IVA</span>
              <select
                value={condicionIva}
                onChange={(e) => setCondicionIva(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Seleccionar…</option>
                <option value="responsable_inscripto">
                  Responsable Inscripto
                </option>
                <option value="monotributista">Monotributista</option>
                <option value="exento">Exento</option>
                <option value="consumidor_final">Consumidor Final</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Domicilio</span>
              <Input
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Teléfono</span>
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Punto de venta</span>
              <Input
                type="number"
                min={1}
                value={puntoDeVenta}
                onChange={(e) => setPuntoDeVenta(e.target.value)}
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditMode(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={saving || !nombre.trim()}
                onClick={() => void handleSave()}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        ) : (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Nombre del negocio</dt>
              <dd className="font-medium">{tenant?.nombre ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Razón social</dt>
              <dd>{tenant?.razon_social ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CUIT</dt>
              <dd className="font-mono">{tenant?.cuit ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Condición IVA</dt>
              <dd>
                {tenant?.condicion_iva
                  ? (CONDICION_IVA_LABELS[tenant.condicion_iva] ??
                    tenant.condicion_iva)
                  : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Domicilio</dt>
              <dd>{tenant?.domicilio ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd>{tenant?.telefono ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{tenant?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Punto de venta</dt>
              <dd className="font-mono">{tenant?.punto_de_venta ?? 1}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {tenant?.plan === 'completo'
                    ? 'Plan Completo'
                    : 'Plan Base'}
                </span>
              </dd>
            </div>
          </dl>
        )}
      </section>

      {modulos.facturador_pos && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-medium mb-4">Preferencias POS</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Estas preferencias se guardan en este dispositivo (no en el servidor).
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={posPrefs.sonidos}
                onChange={(e) => updatePosPrefs({ sonidos: e.target.checked })}
                className="size-4 rounded border-input"
              />
              Sonidos de confirmación y error
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Ancho de ticket térmico</span>
              <Select
                value={posPrefs.anchoTicket}
                onValueChange={(v) => updatePosPrefs({ anchoTicket: v as '80mm' | '57mm' })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">80 mm</SelectItem>
                  <SelectItem value="57mm">57 mm</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={posPrefs.stockBloqueante}
                onChange={(e) => updatePosPrefs({ stockBloqueante: e.target.checked })}
                className="size-4 rounded border-input"
              />
              Bloquear ventas sin stock suficiente
            </label>
          </div>
        </section>
      )}
    </div>
  );
}
