import { requireModulo } from '@/lib/modulos/page-guard';

export default async function PresupuestosLayout({ children }: { children: React.ReactNode }) {
  await requireModulo('presupuestos');
  return <>{children}</>;
}
