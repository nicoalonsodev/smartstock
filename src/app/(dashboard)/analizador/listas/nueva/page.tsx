'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { UploadLista } from '@/components/analizador/upload-lista';

type Proveedor = { id: string; nombre: string };

export default function NuevaListaPage() {
  const router = useRouter();
  const { canEdit } = useDashboardRole();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/proveedores');
      if (!res.ok) return;
      const json = (await res.json()) as { proveedores: Proveedor[] };
      setProveedores(json.proveedores ?? []);
    })();
  }, []);

  const onSuccess = useCallback(
    (lista: { id: string }) => {
      router.push(`/analizador/listas/${lista.id}`);
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cargar lista de precios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subí una lista de proveedor en PDF, imagen o Excel. Los items se extraen automáticamente.
        </p>
      </div>

      {!canEdit ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tu rol no permite cargar listas.
        </p>
      ) : null}

      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="proveedor-lista">
            Proveedor <span className="text-red-500">*</span>
          </label>
          <select
            id="proveedor-lista"
            className="w-full max-w-md rounded border px-3 py-2 text-sm"
            value={proveedorId}
            disabled={!canEdit}
            onChange={(e) => setProveedorId(e.target.value)}
          >
            <option value="">— Seleccionar proveedor —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="fecha-desde">
              Vigencia desde
            </label>
            <input
              id="fecha-desde"
              type="date"
              className="w-full rounded border px-3 py-2 text-sm"
              value={fechaDesde}
              disabled={!canEdit}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="fecha-hasta">
              Vigencia hasta
            </label>
            <input
              id="fecha-hasta"
              type="date"
              className="w-full rounded border px-3 py-2 text-sm"
              value={fechaHasta}
              disabled={!canEdit}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!proveedorId && canEdit ? (
        <p className="text-sm text-amber-600">Seleccioná un proveedor para continuar.</p>
      ) : null}

      <UploadLista
        proveedorId={proveedorId}
        fechaDesde={fechaDesde || undefined}
        fechaHasta={fechaHasta || undefined}
        onSuccess={onSuccess}
        disabled={!canEdit}
      />

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/analizador/listas" className="underline underline-offset-4">
          Volver a listas
        </Link>
      </p>
    </div>
  );
}
