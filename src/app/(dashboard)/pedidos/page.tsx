import { requireModulo } from '@/lib/modulos/page-guard';

export default async function PedidosPage() {
  await requireModulo('pedidos');

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
      <p className="text-muted-foreground">
        El módulo de pedidos está habilitado. El listado y el flujo completo se implementan en los
        tickets del Bloque C (v3.0).
      </p>
    </div>
  );
}
