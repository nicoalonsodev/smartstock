import path from 'node:path';

import { config } from 'dotenv';

import '@testing-library/jest-dom/vitest';

config({ path: path.resolve(process.cwd(), '.env.local') });
