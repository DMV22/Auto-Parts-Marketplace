import 'dotenv/config';
import { formatPublicDemoDatabaseTarget } from '../src/prisma/public-demo-database-target';
import { authorizePublicDemoSeed } from '../src/prisma/public-demo-seed-authorization';
import { runDemoSeed } from './seed';
import { DEMO_SEED_VERSION } from './seed-manifest';

async function bootstrap(): Promise<void> {
  let authorization: ReturnType<typeof authorizePublicDemoSeed>;

  try {
    authorization = authorizePublicDemoSeed({
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL,
      expectedDatabaseName: process.env.PUBLIC_DEMO_DATABASE_NAME,
      testDatabaseUrl: process.env.TEST_DATABASE_URL,
      confirmation: process.env.PUBLIC_DEMO_BOOTSTRAP_CONFIRMATION,
      seedVersion: DEMO_SEED_VERSION,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`Public-demo bootstrap rejected: ${message}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `${formatPublicDemoDatabaseTarget(authorization.target)} ` +
      `seedVersion=${DEMO_SEED_VERSION}\n`,
  );

  try {
    await runDemoSeed(authorization.databaseUrl);
  } catch {
    process.stderr.write(
      'Public-demo bootstrap failed during synthetic data upsert\n',
    );
    process.exitCode = 1;
  }
}

void bootstrap().catch(() => {
  process.stderr.write('Public-demo bootstrap failed unexpectedly\n');
  process.exitCode = 1;
});
