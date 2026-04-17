import * as path from 'path';
import { config } from 'dotenv';

import { envValidationSchema } from './env.validation';

const SCHEMA_KEYS = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_SSL',
  'DB_LOGGING',
] as const;

/**
 * Load `.env` then `.env.local` (override) from the backend app root,
 * validate with the same schema as Nest `ConfigModule`, and apply
 * defaults/coercions back onto `process.env` for TypeORM CLI.
 */
export function loadEnvFilesAndValidate(): void {
  const root = path.resolve(__dirname, '../..');
  config({ path: path.join(root, '.env') });
  config({ path: path.join(root, '.env.local'), override: true });

  const { error, value } = envValidationSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const detail = error.details.map((d) => d.message).join('; ');
    throw new Error(`Environment validation failed: ${detail}`);
  }

  for (const key of SCHEMA_KEYS) {
    const v = value[key as keyof typeof value];
    if (v !== undefined && v !== null) {
      process.env[key] = String(v);
    }
  }
}
