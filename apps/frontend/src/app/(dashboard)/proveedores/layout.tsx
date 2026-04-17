import { requireModulo } from '@/lib/modulos/page-guard';

export default async function ProveedoresLayout({ children }: { children: React.ReactNode }) {
  await requireModulo('stock');
  return children;
}
