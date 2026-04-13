import { requireModulo } from '@/lib/modulos/page-guard';

export default async function PresupuestosPage() {
  await requireModulo('presupuestos');

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
      <p className="text-muted-foreground">
        El módulo está activo. La UI de presupuestos se desarrolla en la fase de pedidos (v3.0).
      </p>
    </div>
  );
}
