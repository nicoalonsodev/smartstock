import { requireModulo } from '@/lib/modulos/page-guard';

import { ArcaConfigForm } from '@/components/facturacion/arca-config-form';

export default async function ConfiguracionArcaPage() {
  await requireModulo('facturador_arca');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facturación electrónica (ARCA)</h1>
        <p className="text-muted-foreground">
          Configurá tu certificado digital y datos fiscales para emitir comprobantes con CAE.
        </p>
      </div>
      <ArcaConfigForm />
    </div>
  );
}
