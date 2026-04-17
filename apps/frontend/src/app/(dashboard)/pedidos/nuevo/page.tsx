'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

type ClienteOpt = { id: string; nombre: string; razon_social: string | null; activo?: boolean };
type ProductoBusq = {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
};

type Linea = {
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
};

export default function NuevoPedidoPage() {
  const router = useRouter();
  const { canEdit } = useDashboardRole();
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [clienteId, setClienteId] = useState<string>('');
  const [notas, setNotas] = useState('');
  const [qProd, setQProd] = useState('');
  const [hits, setHits] = useState<ProductoBusq[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/clientes');
      const json = await res.json();
      if (res.ok) {
        setClientes((json.clientes as ClienteOpt[]).filter((c) => c.activo !== false));
      }
    })();
  }, []);

  const buscarProductos = useCallback(async () => {
    if (!qProd.trim()) {
      setHits([]);
      return;
    }
    const params = new URLSearchParams();
    params.set('q', qProd.trim());
    params.set('pagina', '1');
    params.set('por_pagina', '15');
    const res = await fetch(`/api/productos?${params.toString()}`);
    const json = await res.json();
    if (res.ok) {
      setHits(
        (json.productos as { id: string; codigo: string; nombre: string; precio_venta: number }[]) ??
          []
      );
    }
  }, [qProd]);

  useEffect(() => {
    const t = setTimeout(() => void buscarProductos(), 300);
    return () => clearTimeout(t);
  }, [buscarProductos]);

  function agregarProducto(p: ProductoBusq) {
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.producto_id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], cantidad: next[i].cantidad + 1 };
        return next;
      }
      return [
        ...prev,
        {
          producto_id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          cantidad: 1,
          precio_unitario: p.precio_venta,
        },
      ];
    });
    setQProd('');
    setHits([]);
  }

  function actualizarLinea(i: number, patch: Partial<Pick<Linea, 'cantidad' | 'precio_unitario'>>) {
    setLineas((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function quitarLinea(i: number) {
    setLineas((prev) => prev.filter((_, j) => j !== i));
  }

  async function guardar() {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: clienteId || null,
        notas: notas.trim() || null,
        items: lineas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? 'Error al crear');
      return;
    }
    router.push(`/pedidos/${json.id}`);
    router.refresh();
  }

  const total = lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-sm text-muted-foreground">No tenés permiso para crear pedidos.</p>
        <Link href="/pedidos" className={cn(buttonVariants({ variant: 'outline' }))}>
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/pedidos" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          ← Pedidos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo pedido</h1>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <label className="grid max-w-md gap-1 text-sm">
          <span className="text-muted-foreground">Cliente (opcional)</span>
          <Select
            value={clienteId || '__none__'}
            onValueChange={(v) => setClienteId(v === '__none__' || v == null ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin cliente</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.razon_social || c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Buscar producto</span>
          <Input
            placeholder="Nombre…"
            value={qProd}
            onChange={(e) => setQProd(e.target.value)}
          />
        </label>

        {hits.length > 0 ? (
          <ul className="max-h-48 overflow-auto rounded-md border text-sm">
            {hits.map((p) => (
              <li key={p.id} className="border-b last:border-0">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                  onClick={() => agregarProducto(p)}
                >
                  <span>
                    <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>{' '}
                    {p.nombre}
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(p.precio_venta)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Notas</span>
          <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
        </label>
      </section>

      <section className="rounded-xl border bg-card shadow-sm">
        <h2 className="border-b px-4 py-3 text-sm font-medium">Ítems</h2>
        {lineas.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Agregá al menos un producto.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="w-24">Cant.</TableHead>
                <TableHead className="w-32">P. unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map((l, i) => (
                <TableRow key={`${l.producto_id}-${i}`}>
                  <TableCell className="font-mono text-xs">{l.codigo}</TableCell>
                  <TableCell>{l.nombre}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="h-8"
                      value={l.cantidad}
                      onChange={(e) =>
                        actualizarLinea(i, { cantidad: Math.max(1, parseInt(e.target.value, 10) || 1) })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8"
                      value={l.precio_unitario}
                      onChange={(e) =>
                        actualizarLinea(i, {
                          precio_unitario: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(l.cantidad * l.precio_unitario)}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" onClick={() => quitarLinea(i)}>
                      Quitar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-end border-t px-4 py-3 text-sm">
          <span className="font-semibold">Total: {formatCurrency(total)}</span>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="button" disabled={saving || lineas.length === 0} onClick={() => void guardar()}>
          {saving ? 'Guardando…' : 'Guardar borrador'}
        </Button>
      </div>
    </div>
  );
}
