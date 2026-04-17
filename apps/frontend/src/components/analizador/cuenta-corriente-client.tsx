'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CreditCard,
  DollarSign,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CuentaCorriente {
  id: string;
  saldo: number;
  limite_credito: number | null;
}

interface Pago {
  id: string;
  monto: number;
  tipo_pago: string;
  referencia: string | null;
  notas: string | null;
  fecha: string;
  created_at: string;
}

interface ComprobanteResumen {
  id: string;
  tipo: string;
  numero: number | null;
  total: number;
  fecha: string;
}

const TIPO_PAGO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
};

const TIPO_COMP_LABELS: Record<string, string> = {
  factura_a: 'Factura A',
  factura_b: 'Factura B',
  factura_c: 'Factura C',
  nota_credito_a: 'NC A',
  nota_credito_b: 'NC B',
  nota_credito_c: 'NC C',
  remito: 'Remito',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CuentaCorrienteClient({
  clienteId,
  canEdit,
}: {
  clienteId: string;
  canEdit: boolean;
}) {
  const [cuenta, setCuenta] = useState<CuentaCorriente | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [comprobantes, setComprobantes] = useState<ComprobanteResumen[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [monto, setMonto] = useState('');
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analizador/cuenta-corriente?cliente_id=${clienteId}`);
      if (res.ok) {
        const json = await res.json();
        setCuenta(json.cuenta);
        setPagos(json.pagos ?? []);
        setComprobantes(json.comprobantes ?? []);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => { void load(); }, [load]);

  async function registrarPago() {
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/analizador/cuenta-corriente/pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId,
          monto: montoNum,
          tipo_pago: tipoPago,
          referencia: referencia || undefined,
          notas: notas || undefined,
        }),
      });

      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? 'Error al registrar pago');
      } else {
        setShowForm(false);
        setMonto('');
        setReferencia('');
        setNotas('');
        void load();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando cuenta corriente...
      </div>
    );
  }

  const saldo = cuenta ? Number(cuenta.saldo) : 0;
  const limite = cuenta?.limite_credito != null ? Number(cuenta.limite_credito) : null;
  const excedeCredito = limite != null && saldo > limite;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" /> Saldo
          </div>
          <p className={cn(
            'mt-1 text-xl font-semibold tabular-nums',
            saldo > 0 ? 'text-red-600' : saldo < 0 ? 'text-emerald-600' : '',
          )}>
            {formatCurrency(saldo)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" /> Límite de crédito
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {limite != null ? formatCurrency(limite) : 'Sin límite'}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" /> Pagos registrados
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums">{pagos.length}</p>
        </div>
      </div>

      {/* Credit warning */}
      {excedeCredito && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Este cliente excede su límite de crédito ({formatCurrency(limite!)}). Saldo actual: {formatCurrency(saldo)}.
        </div>
      )}

      {/* Register payment button */}
      {canEdit && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Registrar pago
            </button>
          ) : (
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h4 className="mb-3 font-medium">Nuevo pago</h4>
              {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Monto *</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Tipo de pago</span>
                  <select
                    value={tipoPago}
                    onChange={(e) => setTipoPago(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(TIPO_PAGO_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Referencia</span>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Nro transferencia, cheque..."
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Notas</span>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void registrarPago()}
                  disabled={saving || !monto || parseFloat(monto) <= 0}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Registrando...' : 'Registrar'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment history */}
      {pagos.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Historial de pagos</h4>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                  <th className="px-3 py-2 font-medium">Referencia</th>
                  <th className="px-3 py-2 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-3 py-2 font-mono text-xs">{formatDate(p.fecha)}</td>
                    <td className="px-3 py-2">{TIPO_PAGO_LABELS[p.tipo_pago] ?? p.tipo_pago}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600">{formatCurrency(Number(p.monto))}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.referencia ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.notas ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent comprobantes */}
      {comprobantes.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Comprobantes recientes</h4>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Número</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {comprobantes.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-3 py-2 font-mono text-xs">{formatDate(c.fecha)}</td>
                    <td className="px-3 py-2">{TIPO_COMP_LABELS[c.tipo] ?? c.tipo}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.numero ?? '—'}</td>
                    <td className={cn(
                      'px-3 py-2 text-right font-mono',
                      c.tipo.startsWith('nota_credito') ? 'text-emerald-600' : '',
                    )}>
                      {c.tipo.startsWith('nota_credito') ? '-' : ''}{formatCurrency(Number(c.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!cuenta && pagos.length === 0 && comprobantes.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Este cliente no tiene movimientos de cuenta corriente aún.
        </p>
      )}
    </div>
  );
}
