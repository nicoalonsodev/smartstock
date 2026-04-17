import { requireModulo } from '@/lib/modulos/page-guard';

export default async function FacturacionLayout({ children }: { children: React.ReactNode }) {
  await requireModulo('facturador_simple');
  return children;
}
