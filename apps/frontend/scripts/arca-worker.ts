/**
 * Worker de cola ARCA para ejecutar en VPS o cron (Node + tsx).
 *
 *   npx tsx scripts/arca-worker.ts
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: ARCA_WORKER_BATCH (default 10), ARCA_WORKER_STUB (solo con ambiente homologación en DB)
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runArcaWorkerBatch } from '../src/lib/arca/process-arca-job';
import type { Database } from '../src/types/database';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
loadEnv({ path: resolve(root, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const batchRaw = process.env.ARCA_WORKER_BATCH;
const batch = Math.max(
  1,
  Math.min(50, batchRaw ? parseInt(batchRaw, 10) || 10 : 10),
);

async function main() {
  if (!url || !key) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const summary = await runArcaWorkerBatch(admin, { limit: batch });

  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      reset_stale: summary.resetStale,
      claimed: summary.claimed,
      outcomes: summary.results.map((r) => r.outcome),
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
