import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');

let projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  try {
    const env = readFileSync(envPath, 'utf8');
    const m = env.match(/NEXT_PUBLIC_SUPABASE_URL=https:\/\/([^.]+)\.supabase\.co/);
    if (m) projectRef = m[1];
  } catch {
    /* sin .env.local */
  }
}

if (!projectRef) {
  console.error(
    'Definí SUPABASE_PROJECT_REF o agregá NEXT_PUBLIC_SUPABASE_URL en .env.local.'
  );
  process.exit(1);
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    'Falta SUPABASE_ACCESS_TOKEN. Creá un token en Supabase (Account → Access Tokens) y ejecutá de nuevo.'
  );
  process.exit(1);
}

const out = execSync(
  `npx supabase gen types typescript --project-id ${projectRef} --schema public`,
  {
    encoding: 'utf8',
    cwd: root,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'inherit'],
  }
);

const target = resolve(root, 'src/types/database.ts');
writeFileSync(target, out, 'utf8');
console.log(`Tipos escritos en ${target}`);
