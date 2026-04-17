import { IaPreciosClient } from '@/components/ia/ia-precios-client';
import { requireModulo } from '@/lib/modulos/page-guard';

export default async function IaPreciosPage() {
  await requireModulo('ia_precios');

  return <IaPreciosClient />;
}
