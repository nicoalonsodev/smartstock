import { notFound } from 'next/navigation';

import { ProductoDetalleClient } from '@/app/(dashboard)/productos/[id]/producto-detalle-client';
import { getSessionProfile } from '@/lib/dashboard/session-profile';
import { createServerClient } from '@/lib/supabase/server';

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase.from('producto').select('id').eq('id', id).maybeSingle();
  if (error || !data) notFound();

  const profile = await getSessionProfile();
  const canEdit = profile ? profile.rol !== 'visor' : false;

  return (
    <div className="mx-auto max-w-4xl">
      <ProductoDetalleClient productoId={id} canEdit={canEdit} />
    </div>
  );
}
