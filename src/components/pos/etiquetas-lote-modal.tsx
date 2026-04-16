'use client';

import { useMemo, useRef, useState } from 'react';

import { BarcodeLabel } from '@/components/pos/barcode-label';
import type { ProductoTabla } from '@/components/stock/productos-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  productos: ProductoTabla[];
  open: boolean;
  onClose: () => void;
}

type CopiasPorProducto = Record<string, number>;

export function EtiquetasLoteModal({ productos, open, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const conBarcode = useMemo(() => productos.filter((p) => p.codigo_barras), [productos]);
  const sinBarcode = useMemo(() => productos.filter((p) => !p.codigo_barras), [productos]);

  const [copias, setCopias] = useState<CopiasPorProducto>(() => {
    const init: CopiasPorProducto = {};
    for (const p of conBarcode) init[p.id] = 1;
    return init;
  });

  function setCopiasProd(id: string, n: number) {
    setCopias((prev) => ({ ...prev, [id]: Math.max(1, Math.min(100, n)) }));
  }

  function handlePrint() {
    window.print();
  }

  if (!open) return null;

  const etiquetas: { prod: ProductoTabla; idx: number }[] = [];
  for (const p of conBarcode) {
    const n = copias[p.id] ?? 1;
    for (let i = 0; i < n; i++) {
      etiquetas.push({ prod: p, idx: i });
    }
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-lote-zone,
          #print-lote-zone * {
            visibility: visible;
          }
          #print-lote-zone {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .lote-print-hidden {
            display: none !important;
          }
          .print-label {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4 lote-print-hidden">
        <div className="relative w-full max-w-4xl rounded-xl border bg-background p-6 shadow-xl mt-8 mb-8 lote-print-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Imprimir etiquetas en lote</h2>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {sinBarcode.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {sinBarcode.length} producto(s) sin código de barras (excluidos):
              {' '}{sinBarcode.map((p) => p.nombre).join(', ')}
            </div>
          )}

          {conBarcode.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ninguno de los productos seleccionados tiene código de barras.
            </p>
          ) : (
            <>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground sticky top-0 bg-background">
                      <th className="px-3 py-2 font-medium">Producto</th>
                      <th className="px-3 py-2 font-medium">Código</th>
                      <th className="px-3 py-2 text-right font-medium w-28">Copias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conBarcode.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{p.nombre}</td>
                        <td className="px-3 py-2 font-mono text-xs">{p.codigo_barras}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={copias[p.id] ?? 1}
                            onChange={(e) =>
                              setCopiasProd(p.id, parseInt(e.target.value) || 1)
                            }
                            className="w-20 ml-auto text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Total: {etiquetas.length} etiqueta(s)
                </span>
                <Button onClick={handlePrint}>Imprimir</Button>
              </div>

              <div className="rounded-lg border p-3 max-h-[400px] overflow-y-auto">
                <h3 className="text-xs font-medium text-muted-foreground mb-2">
                  Vista previa (grilla A4)
                </h3>
                <div
                  ref={printRef}
                  className="grid grid-cols-4 gap-1"
                >
                  {etiquetas.map(({ prod, idx }) => (
                    <div key={`${prod.id}-${idx}`} className="print-label">
                      <BarcodeLabel
                        nombre={prod.nombre}
                        codigo={prod.codigo_barras!}
                        precio={prod.precio_venta}
                        sku={prod.codigo}
                        sizeMm="50x30"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        id="print-lote-zone"
        className="hidden print:block print:!visible"
      >
        <div className="grid grid-cols-4 gap-0">
          {etiquetas.map(({ prod, idx }) => (
            <div key={`${prod.id}-${idx}`} className="print-label">
              <BarcodeLabel
                nombre={prod.nombre}
                codigo={prod.codigo_barras!}
                precio={prod.precio_venta}
                sku={prod.codigo}
                sizeMm="50x30"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
