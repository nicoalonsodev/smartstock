import Link from 'next/link';

import { HistorialPreciosClient } from '@/components/ia/historial-precios-client';
import { requireModulo } from '@/lib/modulos/page-guard';

export default async function IaPreciosHistorialPage() {
  await requireModulo('ia_precios');

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/ia-precios" className="underline underline-offset-4">
          ← Volver a IA de precios
        </Link>
      </p>
      <HistorialPreciosClient />
    </div>
  );
}
