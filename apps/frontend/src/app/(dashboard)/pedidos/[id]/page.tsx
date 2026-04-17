'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { useModulos } from '@/hooks/useModulos';
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
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { FileText, Truck, X } from 'lucide-react';

type PedidoDetalle = {
  id: string;
  estado: string;
  fecha: string;
  total: number;
  notas: string | null;
  comprobante_id: string | null;
  cliente: { nombre: string; razon_social: string | null } | null;
  items: {
    id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    producto: { id: string; nombre: string; codigo: string };
  }[];
};

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export default function PedidoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { canEdit } = useDashboardRole();
  const { modulos } = useModulos();
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tipoFactura, setTipoFactura] = useState('factura_b');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/pedidos/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setPedido(null);
      setErr(json.error ?? 'Error');
    } else {
      setPedido(json as PedidoDetalle);
      setErr(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cambiarEstado(nuevo: string) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/pedidos/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevo }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? 'Error');
      return;
    }
    await load();
    router.refresh();
  }

  async function facturar() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/pedidos/${id}/facturar`, {
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
    if (json.comprobante_id) {
      router.push(`/facturacion/${json.comprobante_id}`);
    } else {
      await load();
      router.refresh();
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }
  if (!pedido) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{err ?? 'Pedido no encontrado'}</p>
        <Link href="/pedidos" className={cn(buttonVariants({ variant: 'outline' }))}>
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/pedidos" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            ← Pedidos
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Pedido #{pedido.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground">{formatDate(pedido.fecha)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Estado: {ESTADO_LABELS[pedido.estado] ?? pedido.estado}
            </p>
            {pedido.cliente ? (
              <p className="mt-1 text-sm">
                Cliente: {pedido.cliente.razon_social || pedido.cliente.nombre}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Sin cliente asignado</p>
            )}
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            {pedido.estado === 'borrador' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void cambiarEstado('confirmado')}
                >
                  Confirmar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => void cambiarEstado('cancelado')}
                >
                  <X className="mr-1 h-4 w-4" /> Cancelar
                </Button>
              </>
            ) : null}
            {pedido.estado === 'confirmado' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void cambiarEstado('entregado')}
                >
                  <Truck className="mr-1 h-4 w-4" /> Marcar entregado
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => void cambiarEstado('cancelado')}
                >
                  <X className="mr-1 h-4 w-4" /> Cancelar
                </Button>
              </>
            ) : null}
            {pedido.estado === 'entregado' && !pedido.comprobante_id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={tipoFactura} onValueChange={(v) => setTipoFactura(v ?? 'factura_b')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="factura_a">Factura A</SelectItem>
                    <SelectItem value="factura_b">Factura B</SelectItem>
                    <SelectItem value="factura_c">Factura C</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" disabled={busy} onClick={() => void facturar()}>
                  <FileText className="mr-1 h-4 w-4" /> Generar factura
                </Button>
                {modulos.facturador_pos && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      sessionStorage.setItem(
                        'smartstock_pos_from_pedido',
                        JSON.stringify({
                          pedidoId: pedido.id,
                          items: pedido.items.map((it) => ({
                            producto: {
                              id: it.producto.id,
                              codigo: it.producto.codigo,
                              nombre: it.producto.nombre,
                              precio_venta: it.precio_unitario,
                              stock_actual: 999,
                            },
                            cantidad: it.cantidad,
                          })),
                        }),
                      );
                      router.push('/facturacion/pos');
                    }}
                  >
                    Enviar al POS
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">P. unitario</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedido.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.producto.codigo}</TableCell>
                <TableCell>{item.producto.nombre}</TableCell>
                <TableCell className="text-right">{item.cantidad}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-right text-lg font-bold">Total: {formatCurrency(pedido.total)}</p>

      {pedido.notas ? (
        <p className="border-t pt-4 text-sm text-muted-foreground">Notas: {pedido.notas}</p>
      ) : null}

      {pedido.comprobante_id ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
          Facturado —{' '}
          <Link href={`/facturacion/${pedido.comprobante_id}`} className="underline">
            Ver comprobante
          </Link>
        </div>
      ) : null}
    </div>
  );
}
