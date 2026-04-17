'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TipoMov = 'entrada' | 'salida' | 'ajuste';

export function MovimientoRapido({
  productoId,
  productoNombre,
  stockActual,
  onSuccess,
}: {
  productoId: string;
  productoNombre: string;
  stockActual: number;
  onSuccess: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMov>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = parseInt(cantidad, 10);
    if (!n || n <= 0) {
      setError('Indicá una cantidad válida');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          tipo,
          cantidad: n,
          motivo: motivo || null,
          referencia_tipo: 'manual',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Error al registrar');
        return;
      }
      setCantidad('');
      setMotivo('');
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border bg-card p-4 shadow-sm"
    >
      <h3 className="font-medium">Movimiento rápido — {productoNombre}</h3>
      <p className="mt-1 text-xs text-muted-foreground">Stock actual: {stockActual}</p>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Tipo</span>
          <select
            className={cn(
              'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
            )}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMov)}
          >
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste (valor final)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Cantidad</span>
          <Input
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Motivo (opc.)</span>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
      </div>
      <Button type="submit" className="mt-3" disabled={loading}>
        {loading ? 'Registrando…' : 'Registrar'}
      </Button>
    </form>
  );
}
