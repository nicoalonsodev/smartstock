import { requireModulo } from '@/lib/modulos/page-guard';

export default async function MovimientosLayout({ children }: { children: React.ReactNode }) {
  await requireModulo('stock');
  return children;
}
