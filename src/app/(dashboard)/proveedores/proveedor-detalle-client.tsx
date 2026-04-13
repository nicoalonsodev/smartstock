'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/types/database';

type Proveedor = Tables<'proveedor'>;

export function ProveedorDetalleClient({
  proveedor,
  canEdit,
}: {
  proveedor: Proveedor;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState(proveedor.nombre);
  const [cuit, setCuit] = useState(proveedor.cuit ?? '');
  const [telefono, setTelefono] = useState(proveedor.telefono ?? '');
  const [email, setEmail] = useState(proveedor.email ?? '');
  const [direccion, setDireccion] = useState(proveedor.direccion ?? '');
  const [notas, setNotas] = useState(proveedor.notas ?? '');

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/proveedores/${proveedor.id}`, {
      method: 'PATCH',
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
      setError(json.error ?? 'Error al guardar');
      return;
    }
    setEditMode(false);
    router.refresh();
  }

  const mapeo = proveedor.mapeo_excel;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">Datos</h2>
          {canEdit && !editMode ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditMode(true)}>
              Editar
            </Button>
          ) : null}
        </div>

        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

        {editMode ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm sm:col-span-2">
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
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Email</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Dirección</span>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Notas</span>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={saving || !nombre.trim()} onClick={() => void save()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        ) : (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">CUIT</dt>
              <dd className="font-mono">{proveedor.cuit ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd>{proveedor.telefono ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{proveedor.email ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Dirección</dt>
              <dd>{proveedor.direccion ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Notas</dt>
              <dd className="whitespace-pre-wrap">{proveedor.notas ?? '—'}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-medium">Perfil de mapeo Excel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se completa automáticamente al usar el importador con este proveedor.
        </p>
        {mapeo != null && typeof mapeo === 'object' && Object.keys(mapeo).length > 0 ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">
            {JSON.stringify(mapeo, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Todavía no hay perfil guardado.</p>
        )}
      </section>
    </div>
  );
}
