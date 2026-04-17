import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { desencriptarCampo } from '@/lib/facturacion/arca/crypto';
import { logArcaOperacion } from '@/lib/facturacion/arca/logger';
import { obtenerTicketAcceso } from '@/lib/facturacion/arca/wsaa';
import { consultarUltimoComprobante } from '@/lib/facturacion/arca/wsfe';
import { moduloGuard } from '@/lib/modulos/guard';

export async function POST() {
  const guard = await moduloGuard('facturador_arca');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  if (session.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede probar conexión' }, { status: 403 });
  }

  const { data: arcaConfig } = await session.supabase
    .from('arca_config')
    .select('*')
    .eq('tenant_id', session.tenantId)
    .single();

  if (!arcaConfig?.certificado_pem || !arcaConfig?.clave_privada_pem) {
    return NextResponse.json({
      wsaa: { ok: false, error: 'Certificado o clave privada no configurados' },
      wsfe: { ok: false, error: 'No se pudo probar sin ticket WSAA' },
    });
  }

  const resultado: {
    wsaa: { ok: boolean; error?: string };
    wsfe: { ok: boolean; ultimoComprobante?: number; error?: string };
  } = {
    wsaa: { ok: false },
    wsfe: { ok: false },
  };

  // 1. Probar WSAA
  try {
    const certPem = desencriptarCampo(arcaConfig.certificado_pem);
    const keyPem = desencriptarCampo(arcaConfig.clave_privada_pem);

    const ticket = await obtenerTicketAcceso(certPem, keyPem, arcaConfig.ambiente);

    await session.supabase
      .from('arca_config')
      .update({
        ticket_acceso: ticket.token,
        ticket_sign: ticket.sign,
        ticket_expiracion: ticket.expiracion.toISOString(),
      })
      .eq('tenant_id', session.tenantId);

    await logArcaOperacion(session.supabase, session.tenantId, {
      servicio: 'WSAA',
      operacion: 'TestConnection',
      requestXml: '[test connection]',
      responseXml: '[ticket obtenido]',
      exitoso: true,
    });

    resultado.wsaa = { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    resultado.wsaa = { ok: false, error: msg };

    await logArcaOperacion(session.supabase, session.tenantId, {
      servicio: 'WSAA',
      operacion: 'TestConnection',
      requestXml: '[test connection]',
      responseXml: '',
      exitoso: false,
      errorCodigo: 'TEST_WSAA_FAIL',
      errorMensaje: msg,
    });

    resultado.wsfe = { ok: false, error: 'No se pudo probar WSFE sin ticket WSAA' };
    return NextResponse.json(resultado);
  }

  // 2. Probar WSFE (FECompUltimoAutorizado)
  if (arcaConfig.cuit_emisor && arcaConfig.punto_de_venta) {
    try {
      const ultimo = await consultarUltimoComprobante(
        session.supabase,
        {
          tenant_id: arcaConfig.tenant_id,
          cuit_emisor: arcaConfig.cuit_emisor,
          punto_de_venta: arcaConfig.punto_de_venta,
          ambiente: arcaConfig.ambiente,
        },
        'factura_b',
      );

      resultado.wsfe = { ok: true, ultimoComprobante: ultimo };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resultado.wsfe = { ok: false, error: msg };
    }
  } else {
    resultado.wsfe = { ok: false, error: 'CUIT o punto de venta no configurados' };
  }

  return NextResponse.json(resultado);
}
