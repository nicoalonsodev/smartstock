'use client';

import { useCallback, useEffect, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Categoria = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
};

export default function CategoriasPage() {
  const { canEdit } = useDashboardRole();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/categorias');
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error al cargar');
      setCategorias([]);
    } else {
      setError(null);
      setCategorias(json.categorias ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setNombre('');
    setDescripcion('');
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Categoria) {
    setEditing(c);
    setNombre(c.nombre);
    setDescripcion(c.descripcion ?? '');
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const res = await fetch(`/api/categorias/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, descripcion: descripcion || null }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'No se pudo guardar');
          setSaving(false);
          return;
        }
      } else {
        const res = await fetch('/api/categorias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, descripcion: descripcion || null }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'No se pudo crear');
          setSaving(false);
          return;
        }
      }
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(c: Categoria) {
    if (!confirm(`¿Desactivar la categoría «${c.nombre}»?`)) return;
    const res = await fetch(`/api/categorias/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: false }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Error');
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrupá productos por rubro. El nombre debe ser único en tu negocio.
          </p>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => openCreate()}>
              Nueva categoría
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
                  <DialogDescription>
                    {editing
                      ? 'Actualizá el nombre o la descripción.'
                      : 'Completá los datos de la nueva categoría.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Nombre</span>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Descripción (opcional)</span>
                    <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                  </label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !nombre.trim()}
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      {error && !open ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="rounded-xl border bg-card shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        ) : categorias.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay categorías todavía.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-28">Estado</TableHead>
                {canEdit ? <TableHead className="w-40 text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.descripcion ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        c.activa
                          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800'
                          : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                      }
                    >
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        Editar
                      </Button>
                      {c.activa ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => void handleDeactivate(c)}
                        >
                          Desactivar
                        </Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
