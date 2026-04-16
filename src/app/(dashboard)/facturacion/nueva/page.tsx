import { EmitirComprobanteClient } from '@/app/(dashboard)/facturacion/nueva/emitir-comprobante-client';

export default async function NuevaFacturacionPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const sp = await searchParams;
  const initialTipo = sp.tipo === 'presupuesto' ? 'presupuesto' : undefined;
  return <EmitirComprobanteClient initialTipo={initialTipo} />;
}
