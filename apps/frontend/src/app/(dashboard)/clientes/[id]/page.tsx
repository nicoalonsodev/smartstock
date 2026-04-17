import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ClienteDetalleClient } from '@/app/(dashboard)/clientes/cliente-detalle-client';
import { CuentaCorrienteClient } from '@/components/analizador/cuenta-corriente-client';
import { buttonVariants } from '@/components/ui/button';
import { getSessionProfile } from '@/lib/dashboard/session-profile';
import { createServerClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: cliente, error } = await supabase
    .from('cliente')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !cliente) notFound();

  const profile = await getSessionProfile();
  const canEdit = profile ? profile.rol !== 'visor' : false;

  let showCuentaCorriente = false;
  try {
    const { data: config } = await supabase
      .from('modulo_config')
      .select('analizador_rentabilidad')
      .maybeSingle();
    showCuentaCorriente = !!config?.analizador_rentabilidad;
  } catch {
    // non-critical
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/clientes"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {cliente.razon_social || cliente.nombre}
        </h1>
      </div>

      <ClienteDetalleClient cliente={cliente} />

      {showCuentaCorriente && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-medium">Cuenta corriente</h2>
          <CuentaCorrienteClient clienteId={id} canEdit={canEdit} />
        </section>
      )}
    </div>
  );
}
