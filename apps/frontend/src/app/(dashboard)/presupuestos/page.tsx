'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useModulos } from '@/hooks/useModulos';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

type PresupuestoRow = {
  id: string;
  numero: number;
  fecha: string;
  total: number;
  estado: string;
  cliente: { nombre: string; razon_social: string | null } | null;
};

function FilaAcciones({
  presupuestoId,
  estado,
  canEdit,
  tienePedidos,
  tieneFacturador,
  onHecho,
}: {
  presupuestoId: string;
  estado: string;
  canEdit: boolean;
  tienePedidos: boolean;
  tieneFacturador: boolean;
  onHecho: () => void;
}) {
  const router = useRouter();
  const [tipoFactura, setTipoFactura] = useState('factura_b');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const anulado = estado === 'anulado';

  async function convertirPedido() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/presupuestos/${presupuestoId}/convertir-a-pedido`, {
      method: 'POST',
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? 'Error');
      return;
    }
    onHecho();
    router.push(`/pedidos/${json.pedido_id}`);
  }

  async function convertirFactura() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/presupuestos/${presupuestoId}/convertir-a-factura`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: tipoFactura }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? 'Error');
      return;
    }
    onHecho();
    if (json.comprobante_id) {
      router.push(`/facturacion/${json.comprobante_id}`);
    }
  }

  if (!canEdit || anulado) {
    return err ? <span className="text-xs text-destructive">{err}</span> : null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {tienePedidos ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void convertirPedido()}>
            Convertir a pedido
          </Button>
        ) : null}
        {tieneFacturador ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={tipoFactura} onValueChange={(v) => setTipoFactura(v ?? 'factura_b')}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="factura_a">Factura A</SelectItem>
                <SelectItem value="factura_b">Factura B</SelectItem>
                <SelectItem value="factura_c">Factura C</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" disabled={busy} onClick={() => void convertirFactura()}>
              Convertir a factura
            </Button>
          </div>
        ) : null}
      </div>
      {err ? <span className="text-xs text-destructive">{err}</span> : null}
    </div>
  );
}

export default function PresupuestosPage() {
  const { canEdit } = useDashboardRole();
  const { modulos, loading: modulosLoading } = useModulos();
  const [lista, setLista] = useState<PresupuestoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      pagina: String(pagina),
      por_pagina: '25',
    });
    const res = await fetch(`/api/presupuestos?${params}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error al cargar');
      setLista([]);
    } else {
      setError(null);
      setLista(json.presupuestos ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [pagina]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPaginas = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cotizaciones sin impacto en stock. Podés convertirlos en pedido borrador o en factura.
          </p>
        </div>
        {canEdit && modulos.facturador_simple ? (
          <Link
            href="/facturacion/nueva?tipo=presupuesto"
            className={cn(buttonVariants())}
          >
            Nuevo presupuesto
          </Link>
        ) : null}
      </div>

      {!modulosLoading && !modulos.facturador_simple ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Para emitir o convertir a factura necesitás el módulo de facturación activo. El listado de
          presupuestos sigue disponible si ya existen datos.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No hay presupuestos todavía.
          {canEdit && modulos.facturador_simple ? (
            <>
              {' '}
              <Link href="/facturacion/nueva?tipo=presupuesto" className="text-primary underline">
                Crear uno
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      <Link href={`/facturacion/${p.id}`} className="hover:underline">
                        #{p.numero}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.fecha)}</TableCell>
                    <TableCell>{p.cliente?.razon_social || p.cliente?.nombre || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.total)}</TableCell>
                    <TableCell className="text-sm capitalize">{p.estado}</TableCell>
                    <TableCell className="text-right">
                      <FilaAcciones
                        presupuestoId={p.id}
                        estado={p.estado}
                        canEdit={canEdit}
                        tienePedidos={modulos.pedidos}
                        tieneFacturador={modulos.facturador_simple}
                        onHecho={() => void load()}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {total} presupuesto{total !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((x) => Math.max(1, x - 1))}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((x) => x + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
