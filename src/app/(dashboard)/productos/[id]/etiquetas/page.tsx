'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BarcodeLabel } from '@/components/pos/barcode-label';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModulos } from '@/hooks/useModulos';
import { cn } from '@/lib/utils';

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  codigo_barras: string | null;
};

type LabelSize = '50x30' | '80x40' | 'a4';

const PRESET_COPIAS = [1, 5, 10, 20] as const;

export default function EtiquetasPage() {
  const { id } = useParams<{ id: string }>();
  const { modulos, loading: modulosLoading } = useModulos();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [copias, setCopias] = useState(1);
  const [size, setSize] = useState<LabelSize>('50x30');

  const load = useCallback(async () => {
    const res = await fetch(`/api/productos/${id}`);
    if (res.ok) {
      const json = await res.json();
      setProducto(json);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function handlePrint() {
    window.print();
  }

  if (loading || modulosLoading) {
    return <p className="text-sm text-muted-foreground p-4">Cargando…</p>;
  }

  if (!modulos.facturador_pos) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Link href={`/productos/${id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          ← Volver al producto
        </Link>
        <p className="text-sm text-destructive">
          El módulo POS no está habilitado para tu plan. Contactá al soporte para activarlo.
        </p>
      </div>
    );
  }

  if (!producto) return <p className="text-sm text-destructive p-4">Producto no encontrado</p>;

  if (!producto.codigo_barras) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Link href={`/productos/${id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          ← Volver al producto
        </Link>
        <p className="text-sm text-muted-foreground">
          Este producto no tiene código de barras asignado. Asigná uno desde la sección &quot;Códigos y escaneo&quot; del producto.
        </p>
      </div>
    );
  }

  const copiasArr = Array.from({ length: copias });

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-zone,
          #print-zone * {
            visibility: visible;
          }
          #print-zone {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hidden {
            display: none !important;
          }
          .print-label {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between print-hidden">
          <div className="flex items-center gap-3">
            <Link href={`/productos/${id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              ← Producto
            </Link>
            <h1 className="text-xl font-semibold">Etiquetas: {producto.nombre}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4 shadow-sm print-hidden">
          <div className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Copias rápidas</span>
            <div className="flex gap-1">
              {PRESET_COPIAS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={copias === n ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCopias(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Personalizado</span>
            <Input
              type="number"
              min={1}
              max={200}
              value={copias}
              onChange={(e) => setCopias(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
              className="w-24"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Tamaño</span>
            <Select value={size} onValueChange={(v) => setSize(v as LabelSize)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50x30">50×30 mm</SelectItem>
                <SelectItem value="80x40">80×40 mm</SelectItem>
                <SelectItem value="a4">A4 (grilla)</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <Button onClick={handlePrint}>Imprimir</Button>
        </div>

        <div
          id="print-zone"
          className="rounded-xl border bg-card p-4 shadow-sm print:border-0 print:shadow-none print:p-0"
        >
          <h2 className="text-sm font-medium mb-3 print-hidden">Vista previa</h2>
          <div
            className={cn(
              'flex flex-wrap gap-2 print:gap-0',
              size === 'a4' && 'grid grid-cols-4 gap-1 print:grid-cols-4',
            )}
          >
            {copiasArr.map((_, i) => (
              <div key={i} className="print-label">
                <BarcodeLabel
                  nombre={producto.nombre}
                  codigo={producto.codigo_barras!}
                  precio={producto.precio_venta}
                  sku={producto.codigo}
                  sizeMm={size === 'a4' ? '50x30' : size}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
