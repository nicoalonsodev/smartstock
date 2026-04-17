import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { verificarVencimientoCertificado } from '@/lib/facturacion/arca/cert-check';
import { desencriptarCampo } from '@/lib/facturacion/arca/crypto';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET() {
  const guard = await moduloGuard('facturador_arca');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { data: config } = await session.supabase
    .from('arca_config')
    .select('certificado_pem')
    .eq('tenant_id', session.tenantId)
    .maybeSingle();

  if (!config?.certificado_pem) {
    return NextResponse.json({ configurado: false });
  }

  try {
    const certPem = desencriptarCampo(config.certificado_pem);
    const info = verificarVencimientoCertificado(certPem);

    return NextResponse.json({
      configurado: true,
      valido: info.valido,
      diasRestantes: info.diasRestantes,
      fechaVencimiento: info.fechaVencimiento?.toISOString() ?? null,
      subject: info.subject,
      alerta: info.diasRestantes <= 30,
      critico: info.diasRestantes <= 7,
      expirado: !info.valido,
    });
  } catch {
    return NextResponse.json({ configurado: true, error: 'Error al verificar certificado' });
  }
}
