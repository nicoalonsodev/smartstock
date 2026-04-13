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

const CONDICION_IVA_LABELS: Record<string, string> = {
  responsable_inscripto: 'Resp. Inscripto',
  monotributista: 'Monotributista',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
};

type ClienteRow = {
  id: string;
  nombre: string;
  razon_social: string | null;
  cuit_dni: string | null;
  condicion_iva: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
};

export default function ClientesPage() {
  const { canEdit } = useDashboardRole();
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [cuitDni, setCuitDni] = useState('');
  const [condicionIva, setCondicionIva] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  const load = useCallback(async (q = '') => {
    setLoading(true);
    const url = q ? `/api/clientes?q=${encodeURIComponent(q)}` : '/api/clientes';
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error al cargar');
      setClientes([]);
    } else {
      setError(null);
      setClientes(json.clientes ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load(busqueda);
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda, load]);

  function openCreate() {
    setNombre('');
    setRazonSocial('');
    setCuitDni('');
    setCondicionIva('');
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
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        razon_social: razonSocial || null,
        cuit_dni: cuitDni || null,
        condicion_iva: condicionIva || null,
        direccion: direccion || null,
        telefono: telefono || null,
        email: email || null,
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
    await load(busqueda);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná tus clientes y sus datos fiscales para facturación.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" onClick={openCreate} className="shrink-0">
            Nuevo cliente
          </Button>
        ) : null}
      </div>

      <Input
        placeholder="Buscar por nombre, razón social o CUIT/DNI…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="max-w-md"
      />

      {error && !open ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="rounded-xl border bg-card shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        ) : clientes.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {busqueda ? 'No se encontraron clientes.' : 'No hay clientes todavía.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CUIT/DNI</TableHead>
                <TableHead>Cond. IVA</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                      {c.razon_social || c.nombre}
                    </Link>
                    {c.razon_social ? (
                      <span className="ml-1 text-xs text-muted-foreground">({c.nombre})</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.cuit_dni ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.condicion_iva ? (CONDICION_IVA_LABELS[c.condicion_iva] ?? c.condicion_iva) : '—'}
                  </TableCell>
                  <TableCell>{c.telefono ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                  <TableCell>
                    <span
                      className={
                        c.activo
                          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800'
                          : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                      }
                    >
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Completá los datos del cliente. La condición IVA determina el tipo de factura.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Nombre *</span>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Razón social</span>
              <Input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">CUIT/DNI</span>
                <Input value={cuitDni} onChange={(e) => setCuitDni(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Condición IVA</span>
                <select
                  value={condicionIva}
                  onChange={(e) => setCondicionIva(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Seleccionar…</option>
                  <option value="responsable_inscripto">Responsable Inscripto</option>
                  <option value="monotributista">Monotributista</option>
                  <option value="exento">Exento</option>
                  <option value="consumidor_final">Consumidor Final</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Dirección</span>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Teléfono</span>
                <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Email</span>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
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
  );
}
