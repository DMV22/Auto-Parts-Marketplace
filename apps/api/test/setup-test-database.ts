import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { getPrismaDatabaseUrl } from '../src/prisma/prisma-database-url';

export default function setupTestDatabase(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test database setup requires NODE_ENV=test');
  }

  const testDatabaseUrl = getPrismaDatabaseUrl();
  const apiRoot = resolve(__dirname, '..');
  const prismaCliPath = resolve(
    apiRoot,
    'node_modules',
    'prisma',
    'build',
    'index.js',
  );

  execFileSync(process.execPath, [prismaCliPath, 'migrate', 'deploy'], {
    cwd: apiRoot,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
    stdio: 'inherit',
  });
}
