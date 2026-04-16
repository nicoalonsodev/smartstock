'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BarcodeInput, type BarcodeInputRef } from '@/components/pos/barcode-input';
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

  // Cart items (managed here, full cart in V60-POS-020)
  const [items, setItems] = useState<
    { producto: ProductoScanned; cantidad: number; peso?: number }[]
  >([]);

  // Load tenant info and user
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

  // Clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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
          setScanError(err.error ?? 'Producto no encontrado');
          return;
        }

        const data: ScanResult = await res.json();
        setLastScanned(data.producto);

        setItems((prev) => {
          if (data.tipo === 'balanza_peso' && data.peso) {
            return [
              ...prev,
              { producto: data.producto, cantidad: data.peso, peso: data.peso },
            ];
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
            return updated;
          }

          return [...prev, { producto: data.producto, cantidad: 1 }];
        });
      } catch {
        setScanError('Error de conexión');
      }
    },
    [],
  );

  const total = items.reduce(
    (sum, it) => sum + it.cantidad * it.producto.precio_venta,
    0,
  );

  const filteredClientes = clienteSearch.trim()
    ? clientes.filter(
        (c) =>
          c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()),
      )
    : clientes;

  return (
    <>
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2 shadow-sm">
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
          {/* Client selector */}
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

          {/* Comprobante type */}
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

          {/* DateTime */}
          <span className="hidden text-sm text-muted-foreground md:inline">
            {now.toLocaleDateString('es-AR')} {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* User */}
          <span className="text-sm font-medium">{userName}</span>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Scan zone + items */}
        <div className="flex flex-1 flex-col p-4 gap-4 overflow-y-auto">
          {/* Scan bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <BarcodeInput
                ref={barcodeRef}
                onScan={handleScan}
                placeholder="Escaneá un código de barras o escribí un SKU…"
                pauseRefocus={showClienteSearch}
                disabled={!canEmit}
              />
            </div>
          </div>

          {/* Scan feedback */}
          {scanError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {scanError}
            </div>
          )}
          {lastScanned && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm dark:border-green-800 dark:bg-green-950/30">
              <span className="font-medium">{lastScanned.nombre}</span>
              <span className="ml-2 text-muted-foreground">
                {formatCurrency(lastScanned.precio_venta)}
              </span>
            </div>
          )}

          {/* Items list (basic, expanded in POS-020) */}
          {items.length > 0 && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Producto</th>
                    <th className="px-4 py-2 text-right font-medium">Cant.</th>
                    <th className="px-4 py-2 text-right font-medium">P. Unit.</th>
                    <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={`${it.producto.id}-${i}`} className="border-b last:border-0">
                      <td className="px-4 py-2">{it.producto.nombre}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {it.peso
                          ? `${it.cantidad.toFixed(3)} kg`
                          : it.cantidad}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(it.producto.precio_venta)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatCurrency(it.cantidad * it.producto.precio_venta)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, j) => j !== i))
                          }
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Summary panel */}
        <aside className="w-80 border-l bg-card flex flex-col justify-between p-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Resumen
            </h2>
            <p className="text-sm">
              {items.length} ítem(s)
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-2xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <Button
              className="w-full h-14 text-lg"
              disabled={items.length === 0 || !canEmit}
            >
              Cobrar
            </Button>
            {!canEmit && (
              <p className="text-xs text-muted-foreground text-center">
                Tu rol no permite emitir comprobantes
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
