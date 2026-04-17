import { NextResponse } from 'next/server';

import { runArcaWorkerBatch } from '@/lib/arca/process-arca-job';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Disparo HTTP para cron (Vercel o similar). Proteger con CRON_SECRET.
 * Límite bajo de trabajos por invocación para no exceder timeout serverless.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createServiceRoleClient();

  try {
    const summary = await runArcaWorkerBatch(admin, { limit: 5 });
    return NextResponse.json({
      reset_stale: summary.resetStale,
      claimed: summary.claimed,
      outcomes: summary.results.map((r) => r.outcome),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
