'use client';

import { useCallback, useEffect, useState } from 'react';

import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';

type ProductoMini = { id: string; codigo: string; nombre: string };

type EntradaHistorial = {
  id: string;
  created_at: string;
  precio_costo_anterior: number | null;
  precio_costo_nuevo: number | null;
  precio_venta_anterior: number | null;
  precio_venta_nuevo: number | null;
  margen_anterior: number | null;
  margen_nuevo: number | null;
  origen: string;
  producto: ProductoMini | ProductoMini[] | null;
};

const ORIGEN_LABELS: Record<string, { label: string; color: string }> = {
  manual: { label: 'Manual', color: 'bg-gray-100 text-gray-700' },
  importacion_excel: { label: 'Excel', color: 'bg-blue-100 text-blue-700' },
  ia_pdf: { label: 'IA', color: 'bg-purple-100 text-purple-700' },
};

function normalizarProducto(
  p: EntradaHistorial['producto'],
): ProductoMini | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export function HistorialPreciosClient() {
  const [origen, setOrigen] = useState<string>('');
  const [productoId, setProductoId] = useState<string>('');
  const [productos, setProductos] = useState<ProductoMini[]>([]);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const porPagina = 50;

  const cargarProductos = useCallback(async () => {
    try {
      const res = await fetch('/api/productos?por_pagina=100&pagina=1');
      const j = (await res.json()) as { productos?: ProductoMini[] };
      if (res.ok && j.productos) setProductos(j.productos);
    } catch {
      /* ignore */
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('pagina', String(pagina));
      q.set('por_pagina', String(porPagina));
      if (origen) q.set('origen', origen);
      if (productoId) q.set('producto_id', productoId);
      const res = await fetch(`/api/precios/historial?${q.toString()}`);
      const j = (await res.json()) as {
        historial?: EntradaHistorial[];
        total?: number;
        error?: string;
      };
      if (res.ok) {
        setHistorial(j.historial ?? []);
        setTotal(j.total ?? 0);
      } else {
        setHistorial([]);
        setTotal(0);
      }
    } catch {
      setHistorial([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [pagina, origen, productoId, porPagina]);

  useEffect(() => {
    void cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Historial de precios</h1>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Origen</span>
          <select
            value={origen}
            onChange={(e) => {
              setPagina(1);
              setOrigen(e.target.value);
            }}
            className="rounded border bg-background px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="manual">Manual</option>
            <option value="importacion_excel">Excel</option>
            <option value="ia_pdf">IA</option>
          </select>
        </label>
        <label className="flex min-w-[220px] flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Producto</span>
          <select
            value={productoId}
            onChange={(e) => {
              setPagina(1);
              setProductoId(e.target.value);
            }}
            className="rounded border bg-background px-3 py-2"
          >
            <option value="">Todos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pl-3 pt-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Producto</th>
                <th className="pb-3 font-medium">Origen</th>
                <th className="pb-3 text-right font-medium">Costo ant.</th>
                <th className="pb-3 text-right font-medium">Costo nuevo</th>
                <th className="pb-3 text-right font-medium">Venta ant.</th>
                <th className="pb-3 text-right font-medium">Venta nuevo</th>
                <th className="pb-3 pr-3 text-right font-medium">Margen</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h) => {
                const prod = normalizarProducto(h.producto);
                const origenInfo = ORIGEN_LABELS[h.origen] ?? {
                  label: h.origen,
                  color: 'bg-gray-100',
                };
                return (
                  <tr key={h.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 pl-3 text-xs text-muted-foreground">
                      {formatDateTime(h.created_at)}
                    </td>
                    <td className="py-2">
                      {prod ? (
                        <>
                          <span className="mr-1 font-mono text-xs text-muted-foreground">
                            {prod.codigo}
                          </span>
                          {prod.nombre}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${origenInfo.color}`}>
                        {origenInfo.label}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono">
                      {h.precio_costo_anterior != null
                        ? formatCurrency(h.precio_costo_anterior)
                        : '—'}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {h.precio_costo_nuevo != null
                        ? formatCurrency(h.precio_costo_nuevo)
                        : '—'}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {h.precio_venta_anterior != null
                        ? formatCurrency(h.precio_venta_anterior)
                        : '—'}
                    </td>
                    <td className="py-2 text-right font-mono font-medium">
                      {h.precio_venta_nuevo != null
                        ? formatCurrency(h.precio_venta_nuevo)
                        : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {h.margen_nuevo != null ? `${h.margen_nuevo.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={pagina <= 1}
            className="rounded border px-3 py-1 disabled:opacity-50"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="text-muted-foreground">
            Página {pagina} de {totalPaginas} ({total} registros)
          </span>
          <button
            type="button"
            disabled={pagina >= totalPaginas}
            className="rounded border px-3 py-1 disabled:opacity-50"
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}
