'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
import type { Database } from '@/types/database';

type Unidad = Database['public']['Enums']['unidad_medida'];

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

export default function NuevoProductoPage() {
  const router = useRouter();
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
  const [porcentajeGanancia, setPorcentajeGanancia] = useState('');
  const [ivaPorcentaje, setIvaPorcentaje] = useState('');
  const [moneda, setMoneda] = useState('$');
  const [rubro, setRubro] = useState('');
  const [subrubro, setSubrubro] = useState('');
  const [ubicacionField, setUbicacionField] = useState('');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [stockInicial, setStockInicial] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch('/api/productos', {
      method: 'POST',
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
        porcentaje_ganancia: porcentajeGanancia ? parseFloat(porcentajeGanancia) : null,
        iva_porcentaje: ivaPorcentaje ? parseFloat(ivaPorcentaje) : null,
        moneda: moneda.trim() || '$',
        rubro: rubro.trim() || null,
        subrubro: subrubro.trim() || null,
        ubicacion: ubicacionField.trim() || null,
        stock_minimo: parseInt(stockMinimo, 10) || 0,
        stock_inicial: stockInicial ? parseInt(stockInicial, 10) : 0,
        fecha_vencimiento: fechaVencimiento || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? 'Error al crear');
      return;
    }
    router.push(`/productos/${json.id}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/productos" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          ← Volver
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo producto</h1>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm"
      >
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Código</span>
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Nombre</span>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Rubro</span>
            <Input value={rubro} onChange={(e) => setRubro(e.target.value)} placeholder="Ej: Ferretería" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Subrubro</span>
            <Input value={subrubro} onChange={(e) => setSubrubro(e.target.value)} placeholder="Ej: Tornillería" />
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
              min="0"
              value={precioCosto}
              onChange={(e) => {
                setPrecioCosto(e.target.value);
                const c = parseFloat(e.target.value);
                const g = parseFloat(porcentajeGanancia);
                if (c > 0 && g > 0) {
                  setPrecioVenta(String(Math.round(c * (1 + g / 100) * 100) / 100));
                }
              }}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Precio venta</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Ganancia %</span>
            <Input
              type="number"
              step="0.01"
              value={porcentajeGanancia}
              onChange={(e) => {
                setPorcentajeGanancia(e.target.value);
                const c = parseFloat(precioCosto);
                const g = parseFloat(e.target.value);
                if (c > 0 && g > 0) {
                  setPrecioVenta(String(Math.round(c * (1 + g / 100) * 100) / 100));
                }
              }}
              placeholder="Ej: 30"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">IVA %</span>
            <Input
              type="number"
              step="0.01"
              value={ivaPorcentaje}
              onChange={(e) => setIvaPorcentaje(e.target.value)}
              placeholder="Default del tenant"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Moneda</span>
            <Input value={moneda} onChange={(e) => setMoneda(e.target.value)} placeholder="$" />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Ubicación</span>
          <Input value={ubicacionField} onChange={(e) => setUbicacionField(e.target.value)} placeholder="Ej: Estante A3" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Stock mínimo</span>
            <Input
              type="number"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Stock inicial (opc.)</span>
            <Input
              type="number"
              min="0"
              value={stockInicial}
              onChange={(e) => setStockInicial(e.target.value)}
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Vencimiento (opc.)</span>
          <Input
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
          />
        </label>

        <Button type="submit" disabled={saving || !codigo.trim() || !nombre.trim()}>
          {saving ? 'Creando…' : 'Crear producto'}
        </Button>
      </form>
    </div>
  );
}
