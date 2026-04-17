import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { tipoRequiereArca } from '@/lib/arca/tipos-fiscales';

export type EncolarArcaResult =
  | { ok: true; jobId: string; mensaje: string }
  | { ok: false; status: number; error: string };

/**
 * Encola un comprobante para autorización ARCA asíncrona.
 * Requiere módulo facturador_arca (validar antes con moduloGuard).
 */
export async function encolarComprobanteArca(
  supabase: SupabaseClient<Database>,
  ctx: { tenantId: string },
  comprobanteId: string,
): Promise<EncolarArcaResult> {
  const { data: comp, error: cErr } = await supabase
    .from('comprobante')
    .select('id, tenant_id, tipo, estado, cae')
    .eq('id', comprobanteId)
    .maybeSingle();

  if (cErr) {
    return { ok: false, status: 500, error: cErr.message };
  }
  if (!comp || comp.tenant_id !== ctx.tenantId) {
    return { ok: false, status: 404, error: 'Comprobante no encontrado' };
  }

  if (!tipoRequiereArca(comp.tipo)) {
    return {
      ok: false,
      status: 400,
      error: 'Este tipo de comprobante no se envía a ARCA',
    };
  }

  if (comp.estado !== 'emitido' && comp.estado !== 'pendiente_arca') {
    return {
      ok: false,
      status: 400,
      error: 'Solo se pueden encolar comprobantes emitidos o pendientes de ARCA',
    };
  }

  if (comp.cae) {
    return { ok: false, status: 400, error: 'El comprobante ya tiene CAE' };
  }

  const { data: existente, error: eErr } = await supabase
    .from('arca_job')
    .select('id, status')
    .eq('comprobante_id', comprobanteId)
    .maybeSingle();

  if (eErr) {
    return { ok: false, status: 500, error: eErr.message };
  }

  if (existente) {
    if (existente.status === 'completed') {
      return { ok: false, status: 400, error: 'Este comprobante ya fue autorizado por ARCA' };
    }
    if (existente.status === 'pending' || existente.status === 'processing') {
      return { ok: false, status: 409, error: 'El comprobante ya está en cola ARCA' };
    }
    if (existente.status === 'failed') {
      const { error: upJob } = await supabase
        .from('arca_job')
        .update({
          status: 'pending',
          attempts: 0,
          next_attempt_at: null,
          last_error: null,
        })
        .eq('id', existente.id);

      if (upJob) {
        return { ok: false, status: 500, error: upJob.message };
      }

      const { error: upComp } = await supabase
        .from('comprobante')
        .update({ estado: 'pendiente_arca' })
        .eq('id', comprobanteId);

      if (upComp) {
        return { ok: false, status: 500, error: upComp.message };
      }

      return {
        ok: true,
        jobId: existente.id,
        mensaje: 'Reencolado tras fallo anterior',
      };
    }
  }

  const { data: inserted, error: iErr } = await supabase
    .from('arca_job')
    .insert({
      tenant_id: ctx.tenantId,
      comprobante_id: comprobanteId,
      status: 'pending',
    })
    .select('id')
    .single();

  if (iErr) {
    return { ok: false, status: 500, error: iErr.message };
  }

  const { error: upEstado } = await supabase
    .from('comprobante')
    .update({ estado: 'pendiente_arca' })
    .eq('id', comprobanteId);

  if (upEstado) {
    return { ok: false, status: 500, error: upEstado.message };
  }

  return {
    ok: true,
    jobId: inserted.id,
    mensaje: 'Encolado para autorización ARCA',
  };
}
