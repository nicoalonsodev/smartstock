'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BarcodeInput, type BarcodeInputRef } from '@/components/pos/barcode-input';
import { CobroModal } from '@/components/pos/cobro-modal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';

type Cliente = {
  id: string;
  nombre: string;
  condicion_iva: string;
};

type ProductoScanned = {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
  es_pesable?: boolean;
  unidad?: string;
};

type ScanResult = {
  producto: ProductoScanned;
  tipo: string;
  peso?: number;
};

export type CartItem = {
  producto: ProductoScanned;
  cantidad: number;
  peso?: number;
};

type DescuentoTipo = 'porcentaje' | 'monto';

export default function PosPage() {
  const barcodeRef = useRef<BarcodeInputRef>(null);
  const [tenantName, setTenantName] = useState('');
  const [userName, setUserName] = useState('');
  const [canEmit, setCanEmit] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [tipoComprobante, setTipoComprobante] = useState<'ticket' | 'factura'>('ticket');
  const [lastScanned, setLastScanned] = useState<ProductoScanned | null>(null);
  const [scanError, setScanError] = useState('');
  const [now, setNow] = useState(new Date());
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  const [items, setItems] = useState<CartItem[]>([]);

  // Discount
  const [descuentoTipo, setDescuentoTipo] = useState<DescuentoTipo>('porcentaje');
  const [descuentoValor, setDescuentoValor] = useState(0);

  // Weight entry modal
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState<ProductoScanned | null>(null);
  const [weightInput, setWeightInput] = useState('');

  // Cancel confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Cobro modal
  const [showCobro, setShowCobro] = useState(false);

  useEffect(() => {
    async function init() {
      const [profileRes, clientesRes] = await Promise.all([
        fetch('/api/perfil'),
        fetch('/api/clientes'),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json();
        setTenantName(p.tenantName ?? 'Mi Negocio');
        setUserName(p.userDisplayName ?? 'Usuario');
        setCanEmit(p.rol !== 'visor');
      }

      if (clientesRes.ok) {
        const c = await clientesRes.json();
        const list = c.clientes ?? c ?? [];
        setClientes(list);
        const cf = list.find(
          (cl: Cliente) => cl.condicion_iva === 'consumidor_final',
        );
        if (cf) setClienteId(cf.id);
        else if (list.length > 0) setClienteId(list[0].id);
      }
    }
    void init();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Clear highlight after animation
  useEffect(() => {
    if (highlightIdx === null) return;
    const t = setTimeout(() => setHighlightIdx(null), 800);
    return () => clearTimeout(t);
  }, [highlightIdx]);

  const clienteActual = clientes.find((c) => c.id === clienteId);

  const handleScan = useCallback(
    async (codigo: string) => {
      setScanError('');
      setLastScanned(null);

      try {
        const res = await fetch(
          `/api/productos/buscar-por-barcode?codigo=${encodeURIComponent(codigo)}`,
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setScanError(err.error ? `${err.error}: ${codigo}` : `Producto no encontrado: ${codigo}`);
          return;
        }

        const data: ScanResult = await res.json();
        setLastScanned(data.producto);

        // Weighable product scanned without scale weight → open weight modal
        if (data.producto.es_pesable && data.tipo !== 'balanza_peso') {
          setWeightProduct(data.producto);
          setWeightInput('');
          setShowWeightModal(true);
          return;
        }

        setItems((prev) => {
          if (data.tipo === 'balanza_peso' && data.peso) {
            const newItems = [
              ...prev,
              { producto: data.producto, cantidad: data.peso, peso: data.peso },
            ];
            setHighlightIdx(newItems.length - 1);
            return newItems;
          }

          const existing = prev.findIndex(
            (it) => it.producto.id === data.producto.id && !it.peso,
          );
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = {
              ...updated[existing],
              cantidad: updated[existing].cantidad + 1,
            };
            setHighlightIdx(existing);
            return updated;
          }

          const newItems = [...prev, { producto: data.producto, cantidad: 1 }];
          setHighlightIdx(newItems.length - 1);
          return newItems;
        });
      } catch {
        setScanError('Error de conexión');
      }
    },
    [],
  );

  function confirmWeight() {
    const peso = parseFloat(weightInput);
    if (!peso || peso <= 0 || !weightProduct) return;

    setItems((prev) => {
      const newItems = [
        ...prev,
        { producto: weightProduct, cantidad: peso, peso },
      ];
      setHighlightIdx(newItems.length - 1);
      return newItems;
    });
    setShowWeightModal(false);
    setWeightProduct(null);
  }

  function updateCantidad(idx: number, val: string) {
    const n = parseFloat(val);
    if (!n || n <= 0) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], cantidad: n };
      return updated;
    });
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function cancelVenta() {
    setItems([]);
    setDescuentoValor(0);
    setLastScanned(null);
    setScanError('');
    setShowCancelConfirm(false);
    barcodeRef.current?.focus();
  }

  // Calculations
  const subtotal = items.reduce(
    (sum, it) => sum + it.cantidad * it.producto.precio_venta,
    0,
  );
  const subtotalRounded = Math.round(subtotal * 100) / 100;

  const descuentoMonto =
    descuentoTipo === 'porcentaje'
      ? Math.round(subtotalRounded * (descuentoValor / 100) * 100) / 100
      : Math.min(descuentoValor, subtotalRounded);

  const afterDiscount = Math.round((subtotalRounded - descuentoMonto) * 100) / 100;

  const esFacturaA = tipoComprobante === 'factura' && clienteActual?.condicion_iva === 'responsable_inscripto';
  const ivaRate = 21;
  const ivaMonto = esFacturaA
    ? Math.round(afterDiscount * (ivaRate / 100) * 100) / 100
    : 0;
  const total = Math.round((afterDiscount + ivaMonto) * 100) / 100;

  const filteredClientes = clienteSearch.trim()
    ? clientes.filter((c) =>
        c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()),
      )
    : clientes;

  const anyModalOpen = showClienteSearch || showWeightModal || showCancelConfirm || showCobro;

  return (
    <>
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/facturacion"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            ← Salir
          </Link>
          <span className="font-semibold text-lg">{tenantName}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowClienteSearch(!showClienteSearch)}
              >
                {clienteActual?.nombre ?? 'Seleccionar'}
              </Button>
            </div>

            {showClienteSearch && (
              <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover p-2 shadow-lg">
                <Input
                  placeholder="Buscar cliente…"
                  value={clienteSearch}
                  onChange={(e) => setClienteSearch(e.target.value)}
                  autoFocus
                  className="mb-2"
                />
                <div className="max-h-48 overflow-y-auto">
                  {filteredClientes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={cn(
                        'w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted',
                        c.id === clienteId && 'bg-muted font-medium',
                      )}
                      onClick={() => {
                        setClienteId(c.id);
                        setShowClienteSearch(false);
                        setClienteSearch('');
                      }}
                    >
                      {c.nombre}
                    </button>
                  ))}
                  {filteredClientes.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Sin resultados
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Select
            value={tipoComprobante}
            onValueChange={(v) => setTipoComprobante(v as 'ticket' | 'factura')}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ticket">Ticket</SelectItem>
              <SelectItem value="factura">Factura</SelectItem>
            </SelectContent>
          </Select>

          <span className="hidden text-sm text-muted-foreground md:inline">
            {now.toLocaleDateString('es-AR')}{' '}
            {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>

          <span className="text-sm font-medium">{userName}</span>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Scan + items list (~65%) */}
        <div className="flex flex-[65] flex-col p-4 gap-3 overflow-hidden">
          {/* Scan bar */}
          <div className="shrink-0">
            <BarcodeInput
              ref={barcodeRef}
              onScan={handleScan}
              placeholder="Escaneá un código de barras o escribí un SKU…"
              pauseRefocus={anyModalOpen}
              disabled={!canEmit}
            />
          </div>

          {/* Scan feedback */}
          {scanError && (
            <div className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {scanError}
            </div>
          )}
          {lastScanned && !scanError && (
            <div className="shrink-0 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm dark:border-green-800 dark:bg-green-950/30">
              <span className="font-medium">{lastScanned.nombre}</span>
              <span className="ml-2 text-muted-foreground">
                {formatCurrency(lastScanned.precio_venta)}
              </span>
            </div>
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-lg text-muted-foreground">
                Escaneá el primer producto para empezar
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium w-12">#</th>
                    <th className="px-4 py-2 font-medium">Producto</th>
                    <th className="px-4 py-2 font-medium w-16">Unidad</th>
                    <th className="px-4 py-2 text-right font-medium w-28">Cantidad</th>
                    <th className="px-4 py-2 text-right font-medium w-28">P. Unit.</th>
                    <th className="px-4 py-2 text-right font-medium w-28">Subtotal</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const lineSubtotal = Math.round(it.cantidad * it.producto.precio_venta * 100) / 100;
                    return (
                      <tr
                        key={`${it.producto.id}-${i}`}
                        className={cn(
                          'border-b last:border-0 transition-colors',
                          highlightIdx === i && 'bg-green-50 dark:bg-green-950/20',
                        )}
                      >
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{it.producto.nombre}</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          {it.producto.unidad ?? 'unidad'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            min={0.001}
                            step={it.peso ? 0.001 : 1}
                            value={it.cantidad}
                            onChange={(e) => updateCantidad(i, e.target.value)}
                            className="w-24 ml-auto text-right h-8"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(it.producto.precio_venta)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(lineSubtotal)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeItem(i)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Summary panel (~35%) */}
        <aside className="flex w-80 shrink-0 flex-col border-l bg-card p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Resumen</h2>

          <div className="flex-1 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotalRounded)}</span>
            </div>

            {/* Discount */}
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Descuento</span>
              <div className="flex gap-2">
                <Select
                  value={descuentoTipo}
                  onValueChange={(v) => setDescuentoTipo(v as DescuentoTipo)}
                >
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentaje">%</SelectItem>
                    <SelectItem value="monto">$</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={descuentoTipo === 'porcentaje' ? 100 : subtotalRounded}
                  value={descuentoValor || ''}
                  onChange={(e) =>
                    setDescuentoValor(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="flex-1 h-8"
                  placeholder="0"
                />
              </div>
              {descuentoMonto > 0 && (
                <p className="text-xs text-muted-foreground">
                  -{formatCurrency(descuentoMonto)}
                </p>
              )}
            </div>

            {esFacturaA && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA {ivaRate}%</span>
                <span>{formatCurrency(ivaMonto)}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between text-3xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <Button
              className="w-full h-16 text-xl font-bold"
              disabled={items.length === 0 || !canEmit}
              onClick={() => setShowCobro(true)}
            >
              COBRAR (F2)
            </Button>

            {items.length > 0 && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancelar venta (F8)
              </Button>
            )}

            {!canEmit && (
              <p className="text-xs text-muted-foreground text-center">
                Tu rol no permite emitir comprobantes
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <footer className="flex items-center justify-between border-t bg-card px-4 py-1.5 text-xs text-muted-foreground shrink-0">
        <span>
          {items.length} ítem(s) ·{' '}
          {items.reduce((sum, it) => sum + it.cantidad, 0).toFixed(items.some((it) => it.peso) ? 3 : 0)} unidades
        </span>
        <span>Cajero: {userName}</span>
      </footer>

      {/* Weight entry modal */}
      {showWeightModal && weightProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-xl border bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">Ingresar peso manualmente</h3>
            <p className="text-sm text-muted-foreground">
              {weightProduct.nombre} — Producto pesable
            </p>
            <div className="flex items-end gap-2">
              <label className="flex-1 grid gap-1">
                <span className="text-sm text-muted-foreground">Peso (kg)</span>
                <Input
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="0.000"
                  className="text-2xl h-14 text-center"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmWeight();
                    if (e.key === 'Escape') {
                      setShowWeightModal(false);
                      setWeightProduct(null);
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowWeightModal(false);
                  setWeightProduct(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={confirmWeight} disabled={!parseFloat(weightInput)}>
                Agregar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-xl border bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">Cancelar venta</h3>
            <p className="text-sm text-muted-foreground">
              Se eliminarán {items.length} ítem(s) del carrito. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                Volver
              </Button>
              <Button variant="destructive" onClick={cancelVenta}>
                Sí, cancelar venta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cobro modal */}
      {showCobro && (
        <CobroModal
          items={items}
          clienteId={clienteId}
          clienteNombre={clienteActual?.nombre ?? 'Consumidor Final'}
          tipoComprobante={tipoComprobante}
          total={total}
          descuentoMonto={descuentoMonto}
          onSuccess={() => {
            // Will print ticket in POS-022
          }}
          onClose={() => {
            setShowCobro(false);
            cancelVenta();
          }}
        />
      )}
    </>
  );
}
