'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { PedidosTable, type PedidoTabla } from '@/components/pedidos/pedidos-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ClienteOpt = { id: string; nombre: string; razon_social: string | null };

export default function PedidosPage() {
  const { canEdit } = useDashboardRole();
  const [pedidos, setPedidos] = useState<PedidoTabla[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(25);
  const [estado, setEstado] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/clientes');
      const json = await res.json();
      if (res.ok) {
        setClientes(
          (json.clientes as (ClienteOpt & { activo?: boolean })[]).filter((c) => c.activo !== false)
        );
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('pagina', String(pagina));
    params.set('por_pagina', String(porPagina));
    if (estado) params.set('estado', estado);
    if (clienteId) params.set('cliente_id', clienteId);
    const res = await fetch(`/api/pedidos?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error al cargar pedidos');
      setPedidos([]);
    } else {
      setError(null);
      setPedidos((json.pedidos as PedidoTabla[]) ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [pagina, porPagina, estado, clienteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPagina(1);
  }, [estado, clienteId]);

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Creá borradores, confirmá entregas y facturá desde el detalle.
          </p>
        </div>
        {canEdit ? (
          <Link href="/pedidos/nuevo" className={cn(buttonVariants())}>
            Nuevo pedido
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:flex-wrap md:items-end">
        <label className="grid min-w-[10rem] gap-1 text-sm">
          <span className="text-muted-foreground">Estado</span>
          <Select
            value={estado || '__all__'}
            onValueChange={(v) => setEstado(v === '__all__' || v == null ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="entregado">Entregado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="grid min-w-[12rem] flex-1 gap-1 text-sm">
          <span className="text-muted-foreground">Cliente</span>
          <Select
            value={clienteId || '__all__'}
            onValueChange={(v) => setClienteId(v === '__all__' || v == null ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.razon_social || c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <PedidosTable pedidos={pedidos} />
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {total} pedido{total !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
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
