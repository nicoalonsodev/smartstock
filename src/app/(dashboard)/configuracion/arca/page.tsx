import { requireModulo } from '@/lib/modulos/page-guard';

export default async function ConfiguracionArcaPage() {
  await requireModulo('facturador_arca');

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Facturación electrónica (ARCA)</h1>
      <p className="text-muted-foreground">
        Configuración de certificados y homologación ARCA (documentado en el repo, fase v4.0).
      </p>
    </div>
  );
}
