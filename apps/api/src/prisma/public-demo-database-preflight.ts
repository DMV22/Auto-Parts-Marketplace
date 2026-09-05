import {
  formatPublicDemoDatabaseTarget,
  inspectPublicDemoDatabaseTarget,
} from './public-demo-database-target';

try {
  const target = inspectPublicDemoDatabaseTarget({
    databaseUrl: process.env.DATABASE_URL,
    expectedDatabaseName: process.env.PUBLIC_DEMO_DATABASE_NAME,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
  });

  process.stdout.write(`${formatPublicDemoDatabaseTarget(target)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`Public-demo database preflight failed: ${message}\n`);
  process.exitCode = 1;
}
