import {
  inspectPublicDemoDatabaseTarget,
  type PublicDemoDatabaseTarget,
} from './public-demo-database-target';

const PUBLIC_DEMO_NODE_ENV = 'production';

export type PublicDemoSeedAuthorizationInput = {
  nodeEnv: string | undefined;
  databaseUrl: string | undefined;
  expectedDatabaseName: string | undefined;
  testDatabaseUrl: string | undefined;
  confirmation: string | undefined;
  seedVersion: string;
};

export type PublicDemoSeedAuthorization = {
  databaseUrl: string;
  target: PublicDemoDatabaseTarget;
};

export function authorizePublicDemoSeed(
  input: PublicDemoSeedAuthorizationInput,
): PublicDemoSeedAuthorization {
  if (input.nodeEnv !== PUBLIC_DEMO_NODE_ENV) {
    throw new Error('Public-demo bootstrap requires NODE_ENV=production');
  }

  const expectedConfirmation = publicDemoSeedConfirmation(input.seedVersion);

  if (input.confirmation !== expectedConfirmation) {
    throw new Error(
      'PUBLIC_DEMO_BOOTSTRAP_CONFIRMATION does not authorize this seed version',
    );
  }

  const target = inspectPublicDemoDatabaseTarget({
    databaseUrl: input.databaseUrl,
    expectedDatabaseName: input.expectedDatabaseName,
    testDatabaseUrl: input.testDatabaseUrl,
  });

  return {
    databaseUrl: input.databaseUrl as string,
    target,
  };
}

export function publicDemoSeedConfirmation(seedVersion: string): string {
  return `APPLY_SYNTHETIC_DEMO_DATA:${seedVersion}`;
}
