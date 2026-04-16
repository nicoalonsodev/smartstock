'use client';

import Link from 'next/link';
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

type ProveedorRow = {
  id: string;
  nombre: string;
  cuit: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
};

export default function ProveedoresPage() {
  const { canEdit } = useDashboardRole();
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [cuit, setCuit] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/proveedores');
    const json = await res.json();
    if (!res.ok) setError(json.error ?? 'Error');
    else {
      setError(null);
      setProveedores(json.proveedores ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setNombre('');
    setCuit('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setNotas('');
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch('/api/proveedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        cuit: cuit || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        notas: notas || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? 'No se pudo crear');
      return;
    }
    setOpen(false);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná tus proveedores y el perfil de mapeo Excel desde el detalle.
          </p>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={openCreate}>
              Nuevo proveedor
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nuevo proveedor</DialogTitle>
                  <DialogDescription>Datos de contacto y fiscalidad.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Nombre</span>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">CUIT</span>
                    <Input value={cuit} onChange={(e) => setCuit(e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Teléfono</span>
                    <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Dirección</span>
                    <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Notas</span>
                    <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
                  </label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={saving || !nombre.trim()}
                    onClick={() => void handleSave()}
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        ) : proveedores.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay proveedores.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/proveedores/${p.id}`} className="font-medium hover:underline">
                      {p.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.cuit ?? '—'}
                  </TableCell>
                  <TableCell>{p.telefono ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email ?? '—'}</TableCell>
                  <TableCell>
                    <span
                      className={
                        p.activo
                          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800'
                          : 'rounded-full bg-muted px-2 py-0.5 text-xs'
                      }
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
