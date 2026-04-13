import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProveedorDetalleClient } from '@/app/(dashboard)/proveedores/proveedor-detalle-client';
import { getSessionProfile } from '@/lib/dashboard/session-profile';
import { createServerClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default async function ProveedorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const profile = await getSessionProfile();
  const canEdit = profile ? profile.rol !== 'visor' : false;

  const { data: proveedor, error } = await supabase
    .from('proveedor')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !proveedor) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/proveedores"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{proveedor.nombre}</h1>
      </div>

      <ProveedorDetalleClient proveedor={proveedor} canEdit={canEdit} />
    </div>
  );
}
