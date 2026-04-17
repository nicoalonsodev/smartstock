import { notFound } from 'next/navigation';

import { ListaDetalleClient } from '@/components/analizador/lista-detalle-client';
import { getSessionProfile } from '@/lib/dashboard/session-profile';
import { createServerClient } from '@/lib/supabase/server';

export default async function ListaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('lista_precios')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();

  const profile = await getSessionProfile();
  const canEdit = profile ? profile.rol !== 'visor' : false;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <ListaDetalleClient listaId={id} canEdit={canEdit} />
    </div>
  );
}
