'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';

const CONDICION_IVA_LABELS: Record<string, string> = {
  responsable_inscripto: 'Resp. Inscripto',
  monotributista: 'Monotributista',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
};

type Cliente = {
  id: string;
  nombre: string;
  razon_social: string | null;
  condicion_iva: string | null;
};

type Producto = {
  id: string;
  codigo: string | null;
  nombre: string;
  precio_venta: number;
  precio_costo: number;
  stock_actual: number;
};

type ItemForm = {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
};

function determinarTipoLocal(
  emisorIva: string | null,
  receptorIva: string | null,
): string {
  const emisor = emisorIva ?? 'consumidor_final';
  const receptor = receptorIva ?? 'consumidor_final';

  if (emisor === 'monotributista' || emisor === 'exento') return 'factura_c';
  if (emisor === 'responsable_inscripto') {
    if (receptor === 'responsable_inscripto') return 'factura_a';
    return 'factura_b';
  }
  return 'factura_c';
}

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

function margenColor(pct: number): string {
  if (pct >= 30) return 'text-emerald-600';
  if (pct >= 15) return 'text-yellow-600';
  return 'text-red-600';
}

export function EmitirComprobanteClient({ initialTipo }: { initialTipo?: string }) {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tenantIva, setTenantIva] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMargen, setShowMargen] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [tipo, setTipo] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);
  const [notas, setNotas] = useState('');
  const [emitiendo, setEmitiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTipo === 'presupuesto') {
      setTipo('presupuesto');
    }
  }, [initialTipo]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cRes, pRes, tRes, mRes] = await Promise.all([
      fetch('/api/clientes'),
      fetch('/api/productos'),
      fetch('/api/configuracion/tenant'),
      fetch('/api/configuracion/plan'),
    ]);

    if (cRes.ok) {
      const cJson = await cRes.json();
      setClientes(cJson.clientes ?? []);
    }
    if (pRes.ok) {
      const pJson = await pRes.json();
      setProductos(pJson.productos ?? []);
    }
    if (tRes.ok) {
      const tJson = await tRes.json();
      setTenantIva(tJson.condicion_iva ?? null);
    }
    if (mRes.ok) {
      const mJson = await mRes.json();
      const modulos = mJson.modulos ?? mJson;
      setShowMargen(!!modulos.analizador_rentabilidad);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handleClienteChange(id: string) {
    setClienteId(id);
    if (id) {
      const cli = clientes.find((c) => c.id === id);
      if (cli && tipo !== 'presupuesto') {
        const autoTipo = determinarTipoLocal(tenantIva, cli.condicion_iva);
        setTipo(autoTipo);
      }
    }
  }

  function agregarItem(productoId: string) {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return;
    if (items.some((i) => i.producto.id === productoId)) return;
    setItems([
      ...items,
      { producto: prod, cantidad: 1, precio_unitario: prod.precio_venta },
    ]);
  }

  function actualizarItem(
    index: number,
    campo: 'cantidad' | 'precio_unitario',
    valor: number,
  ) {
    const nuevos = [...items];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setItems(nuevos);
  }

  function eliminarItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce(
    (sum, i) => sum + i.cantidad * i.precio_unitario,
    0,
  );
  const esFacturaA = tipo === 'factura_a' || tipo === 'nota_credito_a';
  const ivaMonto = esFacturaA ? Math.round(subtotal * 0.21 * 100) / 100 : 0;
  const total = Math.round((subtotal + ivaMonto) * 100) / 100;

  async function handleEmitir() {
    if (!clienteId || !tipo || items.length === 0) return;
    setEmitiendo(true);
    setError(null);

    const res = await fetch('/api/facturacion/emitir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo,
        cliente_id: clienteId,
        items: items.map((i) => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
        notas: notas || undefined,
      }),
    });

    const json = await res.json();
    setEmitiendo(false);

    if (!res.ok) {
      setError(json.error ?? 'Error al emitir');
      return;
    }

    router.push(`/facturacion/${json.comprobante.id}`);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={initialTipo === 'presupuesto' ? '/presupuestos' : '/facturacion'}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tipo === 'presupuesto' ? 'Nuevo presupuesto' : 'Emitir comprobante'}
        </h1>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Cliente *</span>
          <select
            value={clienteId}
            onChange={(e) => handleClienteChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Seleccionar cliente…</option>
            {clientes
              .filter((c) => c.id && c.nombre)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razon_social || c.nombre}
                  {c.condicion_iva
                    ? ` — ${CONDICION_IVA_LABELS[c.condicion_iva] ?? c.condicion_iva}`
                    : ''}
                </option>
              ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Tipo de comprobante *</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Seleccionar…</option>
            {Object.entries(TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Agregar producto</span>
        <select
          onChange={(e) => {
            agregarItem(e.target.value);
            e.target.value = '';
          }}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Buscar producto…</option>
          {productos
            .filter((p) => !items.some((i) => i.producto.id === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo ? `${p.codigo} — ` : ''}
                {p.nombre} ({formatCurrency(p.precio_venta)}) — Stock:{' '}
                {p.stock_actual}
              </option>
            ))}
        </select>
      </label>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="w-24">Cantidad</TableHead>
                <TableHead className="w-32">Precio</TableHead>
                <TableHead className="w-28 text-right">Subtotal</TableHead>
                {showMargen && <TableHead className="w-20 text-right">Costo</TableHead>}
                {showMargen && <TableHead className="w-20 text-right">Margen</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => {
                const lineaCosto = item.producto.precio_costo * item.cantidad;
                const lineaVenta = item.precio_unitario * item.cantidad;
                const lineaMargenPct = lineaCosto > 0
                  ? ((lineaVenta - lineaCosto) / lineaCosto) * 100
                  : 0;
                return (
                  <TableRow key={item.producto.id}>
                    <TableCell className="font-medium">
                      {item.producto.nombre}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) =>
                          actualizarItem(
                            i,
                            'cantidad',
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.precio_unitario}
                        onChange={(e) =>
                          actualizarItem(
                            i,
                            'precio_unitario',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(lineaVenta)}
                    </TableCell>
                    {showMargen && (
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(lineaCosto)}
                      </TableCell>
                    )}
                    {showMargen && (
                      <TableCell className={cn('text-right font-mono text-xs font-medium', margenColor(lineaMargenPct))}>
                        {lineaMargenPct.toFixed(1)}%
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => eliminarItem(i)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        ×
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {items.length > 0 ? (() => {
        const costoTotal = items.reduce((s, i) => s + i.producto.precio_costo * i.cantidad, 0);
        const margenTotal = subtotal - costoTotal;
        const margenTotalPct = costoTotal > 0 ? (margenTotal / costoTotal) * 100 : 0;
        return (
          <div className="space-y-1 text-right text-sm">
            <p>
              Subtotal:{' '}
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </p>
            {esFacturaA ? (
              <p>
                IVA (21%):{' '}
                <span className="font-mono">{formatCurrency(ivaMonto)}</span>
              </p>
            ) : null}
            <p className="text-lg font-bold">
              Total: <span className="font-mono">{formatCurrency(total)}</span>
            </p>
            {showMargen && (
              <p className={cn('text-sm font-medium', margenColor(margenTotalPct))}>
                Margen total: {formatCurrency(margenTotal)} ({margenTotalPct.toFixed(1)}%)
              </p>
            )}
          </div>
        );
      })() : null}

      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">
          Notas u observaciones (opcional)
        </span>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          rows={2}
        />
      </label>

      <Button
        type="button"
        onClick={() => void handleEmitir()}
        disabled={emitiendo || !clienteId || !tipo || items.length === 0}
        className="w-full py-3"
      >
        {emitiendo
          ? 'Emitiendo…'
          : `Emitir ${TIPO_LABELS[tipo] ?? 'comprobante'}`}
      </Button>
    </div>
  );
}
