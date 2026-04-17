'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

const TIPO_LABELS: Record<string, string> = {
  factura_a: 'Factura A',
  factura_b: 'Factura B',
  factura_c: 'Factura C',
  nota_credito_a: 'Nota de Crédito A',
  nota_credito_b: 'Nota de Crédito B',
  nota_credito_c: 'Nota de Crédito C',
  remito: 'Remito',
  presupuesto: 'Presupuesto',
};

const ESTADO_STYLES: Record<string, string> = {
  emitido: 'bg-emerald-100 text-emerald-800',
  borrador: 'bg-gray-100 text-gray-800',
  anulado: 'bg-red-100 text-red-800',
  pendiente_arca: 'bg-yellow-100 text-yellow-800',
  error_arca: 'bg-red-100 text-red-800',
};

type ComprobanteDetalle = {
  id: string;
  tipo: string;
  numero: number;
  fecha: string;
  subtotal: number;
  iva_monto: number;
  iva_porcentaje: number;
  total: number;
  estado: string;
  pdf_url: string | null;
  cae: string | null;
  cae_vencimiento: string | null;
  notas: string | null;
  cliente: {
    nombre: string;
    razon_social: string | null;
    cuit_dni: string | null;
    condicion_iva: string | null;
  } | null;
  items: {
    id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    producto: { nombre: string; codigo: string | null } | null;
  }[];
};

export default function ComprobanteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [comprobante, setComprobante] = useState<ComprobanteDetalle | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/facturacion/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error al cargar');
    } else {
      setError(null);
      setComprobante(json);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (error || !comprobante) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <p className="text-sm text-destructive">{error ?? 'No encontrado'}</p>
        <Link
          href="/facturacion"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          ← Volver
        </Link>
      </div>
    );
  }

  const c = comprobante;
  const numeroFormateado = `0001-${String(c.numero).padStart(8, '0')}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/facturacion"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          ← Volver
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">
            {TIPO_LABELS[c.tipo] ?? c.tipo} {numeroFormateado}
          </h1>
          <p className="text-muted-foreground">{formatDate(c.fecha)}</p>
          {c.cliente ? (
            <p className="mt-1 text-sm">
              Cliente: {c.cliente.razon_social || c.cliente.nombre}
              {c.cliente.cuit_dni ? (
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  ({c.cliente.cuit_dni})
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {c.pdf_url ? (
            <>
              <a
                href={c.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'gap-1',
                )}
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => window.open(c.pdf_url!, '_blank')}
              >
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${ESTADO_STYLES[c.estado] ?? 'bg-gray-100 text-gray-800'}`}
        >
          {c.estado.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* CAE */}
      {c.cae ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">CAE: {c.cae}</p>
          {c.cae_vencimiento ? (
            <p className="text-green-700">
              Vencimiento: {formatDate(c.cae_vencimiento)}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Items */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">P. Unitario</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.producto?.nombre ?? '—'}
                </TableCell>
                <TableCell className="text-right">{item.cantidad}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(item.precio_unitario)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(item.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totales */}
      <div className="text-right space-y-1 text-sm">
        <p>
          Subtotal:{' '}
          <span className="font-mono">{formatCurrency(c.subtotal)}</span>
        </p>
        {c.iva_monto > 0 ? (
          <p>
            IVA ({c.iva_porcentaje}%):{' '}
            <span className="font-mono">{formatCurrency(c.iva_monto)}</span>
          </p>
        ) : null}
        <p className="text-lg font-bold">
          Total: <span className="font-mono">{formatCurrency(c.total)}</span>
        </p>
      </div>

      {/* Notas */}
      {c.notas ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="text-muted-foreground">Observaciones:</p>
          <p className="mt-1 whitespace-pre-wrap">{c.notas}</p>
        </div>
      ) : null}
    </div>
  );
}
