'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils/formatters';
import Link from 'next/link';

type Mov = {
  id: string;
  tipo: string;
  cantidad: number;
  stock_anterior: number;
  stock_posterior: number;
  motivo: string | null;
  created_at: string;
  producto: { id: string; codigo: string; nombre: string } | null;
  usuario: { nombre: string; apellido: string } | null;
};

export default function MovimientosPage() {
  const [productoId, setProductoId] = useState('');
  const [tipo, setTipo] = useState('');
  const [pagina, setPagina] = useState(1);
  const [movimientos, setMovimientos] = useState<Mov[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (productoId.trim()) params.set('producto_id', productoId.trim());
    if (tipo) params.set('tipo', tipo);
    params.set('pagina', String(pagina));
    params.set('por_pagina', '50');
    const res = await fetch(`/api/movimientos?${params.toString()}`);
    const json = await res.json();
    if (res.ok) {
      setMovimientos(json.movimientos ?? []);
      setTotalPaginas(json.total_paginas ?? 1);
    }
    setLoading(false);
  }, [productoId, tipo, pagina]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPagina(1);
  }, [productoId, tipo]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimientos de stock</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial de entradas, salidas y ajustes.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-end">
        <label className="grid min-w-[12rem] flex-1 gap-1 text-sm">
          <span className="text-muted-foreground">ID producto (UUID)</span>
          <Input
            placeholder="Filtrar por producto…"
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Tipo</span>
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No hay movimientos.
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(m.created_at)}
                    </TableCell>
                    <TableCell>
                      {m.producto ? (
                        <Link
                          href={`/productos/${m.producto.id}`}
                          className="hover:underline"
                        >
                          {m.producto.nombre}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{m.tipo}</TableCell>
                    <TableCell className="text-right font-mono">{m.cantidad}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {m.stock_anterior} → {m.stock_posterior}
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.usuario
                        ? `${m.usuario.nombre} ${m.usuario.apellido}`.trim()
                        : '—'}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate text-muted-foreground">
                      {m.motivo ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPaginas > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </span>
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
      ) : null}
    </div>
  );
}
