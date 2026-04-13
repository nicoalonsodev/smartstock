import { requireModulo } from '@/lib/modulos/page-guard';

export default async function IaPreciosPage() {
  await requireModulo('ia_precios');

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">IA de precios</h1>
      <p className="text-muted-foreground">
        Módulo habilitado. La extracción de precios con IA se implementa en los tickets de v3.0.
      </p>
    </div>
  );
}
