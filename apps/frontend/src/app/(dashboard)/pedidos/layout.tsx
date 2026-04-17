import { requireModulo } from '@/lib/modulos/page-guard';

export default async function PedidosLayout({ children }: { children: React.ReactNode }) {
  await requireModulo('pedidos');
  return <>{children}</>;
}
