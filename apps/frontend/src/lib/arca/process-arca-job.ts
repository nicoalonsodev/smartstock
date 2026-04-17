import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

export type ArcaJobRow = Database['public']['Tables']['arca_job']['Row'];

export type ProcessArcaJobResult =
  | { outcome: 'completed' }
  | { outcome: 'retry_scheduled'; nextAttemptAt: string }
  | { outcome: 'failed_terminal' }
  | { outcome: 'skipped'; reason: string };

function stubEnabled(): boolean {
  const v = process.env.ARCA_WORKER_STUB?.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function backoffMinutes(attemptsAfterClaim: number): number {
  return Math.min(2 ** Math.min(attemptsAfterClaim, 8), 120);
}

/**
 * Procesa un trabajo ARCA reclamado por claim_arca_jobs.
 * Usa cliente Supabase con service_role (sin RLS).
 *
 * - Con ARCA_WORKER_STUB y ambiente homologación: asigna CAE simulado (solo desarrollo).
 * - Sin integración WSFE real: reintenta con backoff hasta max_attempts y luego marca error_arca.
 */
export async function processArcaJob(
  admin: SupabaseClient<Database>,
  job: ArcaJobRow,
): Promise<ProcessArcaJobResult> {
  const { data: comp, error: cErr } = await admin
    .from('comprobante')
    .select('id, tenant_id, tipo, numero, estado, cae')
    .eq('id', job.comprobante_id)
    .maybeSingle();

  if (cErr || !comp) {
    await markJobFailed(admin, job.id, 'Comprobante no encontrado');
    await admin
      .from('comprobante')
      .update({ estado: 'error_arca' })
      .eq('id', job.comprobante_id);
    return { outcome: 'failed_terminal' };
  }

  if (comp.cae) {
    await admin.from('arca_job').update({ status: 'completed', last_error: null }).eq('id', job.id);
    return { outcome: 'skipped', reason: 'Ya tiene CAE' };
  }

  const { data: cfg, error: cfgErr } = await admin
    .from('arca_config')
    .select('ambiente, cuit_emisor, certificado_pem')
    .eq('tenant_id', job.tenant_id)
    .maybeSingle();

  if (cfgErr || !cfg) {
    await logArca(admin, {
      tenant_id: job.tenant_id,
      comprobante_id: job.comprobante_id,
      servicio: 'WSFE',
      operacion: 'precheck',
      exitoso: false,
      error_codigo: 'NO_CONFIG',
      error_mensaje: 'Falta configuración ARCA para el tenant',
      request_xml: null,
      response_xml: null,
    });
    await terminalFailure(admin, job, comp.id, 'Sin configuración ARCA (arca_config)');
    return { outcome: 'failed_terminal' };
  }

  if (!cfg.cuit_emisor || !cfg.certificado_pem) {
    await logArca(admin, {
      tenant_id: job.tenant_id,
      comprobante_id: job.comprobante_id,
      servicio: 'WSFE',
      operacion: 'precheck',
      exitoso: false,
      error_codigo: 'INCOMPLETE_CONFIG',
      error_mensaje: 'Certificado o CUIT emisor incompleto',
      request_xml: null,
      response_xml: null,
    });
    await terminalFailure(admin, job, comp.id, 'Configuración ARCA incompleta');
    return { outcome: 'failed_terminal' };
  }

  const useStub = stubEnabled() && cfg.ambiente === 'homologacion';

  if (useStub) {
    const cae = `STUB${Date.now().toString(36).toUpperCase()}`;
    const venc = new Date();
    venc.setDate(venc.getDate() + 10);
    const vencStr = venc.toISOString().split('T')[0]!;

    await logArca(admin, {
      tenant_id: job.tenant_id,
      comprobante_id: job.comprobante_id,
      servicio: 'WSFE',
      operacion: 'FECAESolicitar_stub',
      exitoso: true,
      error_codigo: null,
      error_mensaje: null,
      request_xml: '<stub/>',
      response_xml: `<CAE>${cae}</CAE>`,
    });

    await admin
      .from('comprobante')
      .update({
        cae,
        cae_vencimiento: vencStr,
        estado: 'emitido',
      })
      .eq('id', comp.id);

    await admin
      .from('arca_job')
      .update({ status: 'completed', last_error: null })
      .eq('id', job.id);

    return { outcome: 'completed' };
  }

  await logArca(admin, {
    tenant_id: job.tenant_id,
    comprobante_id: job.comprobante_id,
    servicio: 'WSFE',
    operacion: 'FECAESolicitar',
    exitoso: false,
    error_codigo: 'NOT_IMPLEMENTED',
    error_mensaje:
      'Integración WSAA/WSFE pendiente. Ejecutá el worker con ARCA_WORKER_STUB=true solo en homologación.',
    request_xml: null,
    response_xml: null,
  });

  if (job.attempts >= job.max_attempts) {
    await admin
      .from('comprobante')
      .update({ estado: 'error_arca' })
      .eq('id', comp.id);

    await admin
      .from('arca_job')
      .update({
        status: 'failed',
        last_error: 'Máximo de reintentos sin integración WSFE',
      })
      .eq('id', job.id);

    return { outcome: 'failed_terminal' };
  }

  const minutes = backoffMinutes(job.attempts);
  const next = new Date(Date.now() + minutes * 60_000).toISOString();

  await admin
    .from('arca_job')
    .update({
      status: 'pending',
      next_attempt_at: next,
      last_error: 'WSFE no implementado; reintento programado',
    })
    .eq('id', job.id);

  return { outcome: 'retry_scheduled', nextAttemptAt: next };
}

async function logArca(
  admin: SupabaseClient<Database>,
  row: Database['public']['Tables']['arca_log']['Insert'],
) {
  await admin.from('arca_log').insert(row);
}

async function markJobFailed(admin: SupabaseClient<Database>, jobId: string, message: string) {
  await admin
    .from('arca_job')
    .update({ status: 'failed', last_error: message })
    .eq('id', jobId);
}

async function terminalFailure(
  admin: SupabaseClient<Database>,
  job: ArcaJobRow,
  comprobanteId: string,
  message: string,
) {
  await admin.from('comprobante').update({ estado: 'error_arca' }).eq('id', comprobanteId);
  await admin
    .from('arca_job')
    .update({ status: 'failed', last_error: message })
    .eq('id', job.id);
}

export type RunArcaWorkerBatchResult = {
  resetStale: number;
  claimed: number;
  results: ProcessArcaJobResult[];
};

/**
 * Una pasada del worker: libera jobs colgados, reclama lote y procesa.
 */
export async function runArcaWorkerBatch(
  admin: SupabaseClient<Database>,
  options?: { limit?: number },
): Promise<RunArcaWorkerBatchResult> {
  const limit = options?.limit ?? 10;

  const { data: resetN, error: rErr } = await admin.rpc('reset_stale_arca_jobs', {
    p_stale_minutes: 15,
  });

  if (rErr) {
    throw new Error(`reset_stale_arca_jobs: ${rErr.message}`);
  }

  const { data: jobs, error: cErr } = await admin.rpc('claim_arca_jobs', {
    p_limit: limit,
  });

  if (cErr) {
    throw new Error(`claim_arca_jobs: ${cErr.message}`);
  }

  const results: ProcessArcaJobResult[] = [];
  for (const job of jobs ?? []) {
    results.push(await processArcaJob(admin, job));
  }

  return {
    resetStale: resetN ?? 0,
    claimed: jobs?.length ?? 0,
    results,
  };
}
