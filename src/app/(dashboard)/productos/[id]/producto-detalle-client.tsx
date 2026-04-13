'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { MovimientoRapido } from '@/components/stock/movimiento-rapido';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database';

type Unidad = Database['public']['Enums']['unidad_medida'];
type MovRow = {
  id: string;
  tipo: Database['public']['Enums']['tipo_movimiento'];
  cantidad: number;
  stock_anterior: number;
  stock_posterior: number;
  motivo: string | null;
  referencia_tipo: Database['public']['Enums']['referencia_tipo'] | null;
  created_at: string;
};

type ProductoDetail = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  proveedor_id: string | null;
  unidad: Unidad;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  fecha_vencimiento: string | null;
  activo: boolean;
  categoria: { id: string; nombre: string } | null;
  proveedor: { id: string; nombre: string } | null;
  movimientos: MovRow[];
};

const UNIDADES: Unidad[] = [
  'unidad',
  'kg',
  'litro',
  'metro',
  'caja',
  'pack',
  'gramo',
  'ml',
];

export function ProductoDetalleClient({
  productoId,
  canEdit,
}: {
  productoId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<ProductoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [unidad, setUnidad] = useState<Unidad>('unidad');
  const [precioCosto, setPrecioCosto] = useState('0');
  const [precioVenta, setPrecioVenta] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/productos/${productoId}`);
    const json = await res.json();
    if (!res.ok) {
      setData(null);
      setLoading(false);
      return;
    }
    const p = json as ProductoDetail;
    setData(p);
    setCodigo(p.codigo);
    setNombre(p.nombre);
    setDescripcion(p.descripcion ?? '');
    setCategoriaId(p.categoria_id ?? '');
    setProveedorId(p.proveedor_id ?? '');
    setUnidad(p.unidad);
    setPrecioCosto(String(p.precio_costo));
    setPrecioVenta(String(p.precio_venta));
    setStockMinimo(String(p.stock_minimo));
    setFechaVencimiento(p.fecha_vencimiento ? p.fecha_vencimiento.slice(0, 10) : '');
    setLoading(false);
  }, [productoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadOpts = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([fetch('/api/categorias'), fetch('/api/proveedores')]);
    const cJson = await cRes.json();
    const pJson = await pRes.json();
    if (cRes.ok) {
      setCategorias(
        (cJson.categorias as { id: string; nombre: string; activa: boolean }[])
          .filter((x) => x.activa)
          .map((x) => ({ id: x.id, nombre: x.nombre }))
      );
    }
    if (pRes.ok) {
      setProveedores(
        (pJson.proveedores as { id: string; nombre: string; activo: boolean }[])
          .filter((x) => x.activo)
          .map((x) => ({ id: x.id, nombre: x.nombre }))
      );
    }
  }, []);

  useEffect(() => {
    void loadOpts();
  }, [loadOpts]);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/productos/${productoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        categoria_id: categoriaId || null,
        proveedor_id: proveedorId || null,
        unidad,
        precio_costo: parseFloat(precioCosto) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        stock_minimo: parseInt(stockMinimo, 10) || 0,
        fecha_vencimiento: fechaVencimiento || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? 'Error al guardar');
      return;
    }
    setEditMode(false);
    await load();
    router.refresh();
  }

  async function softDelete() {
    if (!confirm('¿Dar de baja este producto?')) return;
    const res = await fetch(`/api/productos/${productoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: false }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Error');
      return;
    }
    router.push('/productos');
  }

  if (loading || !data) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/productos" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            ← Lista
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.nombre}</h1>
            <p className="text-sm text-muted-foreground font-mono">{data.codigo}</p>
          </div>
        </div>
        {canEdit && !editMode ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setEditMode(true)}>
              Editar
            </Button>
            <Button type="button" variant="destructive" onClick={() => void softDelete()}>
              Dar de baja
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        {editMode ? (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Código</span>
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Nombre</span>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Descripción</span>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Categoría</span>
                <Select
                  value={categoriaId || '__none__'}
                  onValueChange={(v) => setCategoriaId(v == null || v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Proveedor</span>
                <Select
                  value={proveedorId || '__none__'}
                  onValueChange={(v) => setProveedorId(v == null || v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Unidad</span>
              <Select
                value={unidad}
                onValueChange={(v) => v && setUnidad(v as Unidad)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Precio costo</span>
                <Input
                  type="number"
                  step="0.01"
                  value={precioCosto}
                  onChange={(e) => setPrecioCosto(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Precio venta</span>
                <Input
                  type="number"
                  step="0.01"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Stock mínimo</span>
              <Input
                type="number"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Vencimiento</span>
              <Input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={saving} onClick={() => void save()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Stock actual</dt>
              <dd className="text-lg font-semibold">{data.stock_actual}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Stock mínimo</dt>
              <dd>{data.stock_minimo}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Categoría</dt>
              <dd>{data.categoria?.nombre ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Proveedor</dt>
              <dd>{data.proveedor?.nombre ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Costo / Venta</dt>
              <dd>
                {formatCurrency(data.precio_costo)} / {formatCurrency(data.precio_venta)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vencimiento</dt>
              <dd>{data.fecha_vencimiento ?? '—'}</dd>
            </div>
            {data.descripcion ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{data.descripcion}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </section>

      {canEdit ? (
        <MovimientoRapido
          productoId={data.id}
          productoNombre={data.nombre}
          stockActual={data.stock_actual}
          onSuccess={() => void load()}
        />
      ) : null}

      <section>
        <h2 className="mb-3 font-medium">Últimos movimientos</h2>
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Ant.</TableHead>
                <TableHead className="text-right">Post.</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Sin movimientos
                  </TableCell>
                </TableRow>
              ) : (
                data.movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(m.created_at)}
                    </TableCell>
                    <TableCell>{m.tipo}</TableCell>
                    <TableCell className="text-right font-mono">{m.cantidad}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {m.stock_anterior}
                    </TableCell>
                    <TableCell className="text-right font-mono">{m.stock_posterior}</TableCell>
                    <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                      {m.motivo ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
