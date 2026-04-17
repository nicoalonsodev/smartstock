import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

export async function logArcaOperacion(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  datos: {
    servicio: 'WSAA' | 'WSFE';
    operacion: string;
    requestXml: string;
    responseXml: string;
    comprobanteId?: string;
    exitoso: boolean;
    errorCodigo?: string;
    errorMensaje?: string;
  },
) {
  await supabase.from('arca_log').insert({
    tenant_id: tenantId,
    servicio: datos.servicio,
    operacion: datos.operacion,
    request_xml: datos.requestXml,
    response_xml: datos.responseXml,
    comprobante_id: datos.comprobanteId ?? null,
    exitoso: datos.exitoso,
    error_codigo: datos.errorCodigo ?? null,
    error_mensaje: datos.errorMensaje ?? null,
  });
}
