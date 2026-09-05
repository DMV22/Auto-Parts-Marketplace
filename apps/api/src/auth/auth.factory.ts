import 'dotenv/config';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthInstance } from './auth.types';

const MINIMUM_SECRET_LENGTH = 32;

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export async function createBetterAuth(
  prisma: PrismaService,
): Promise<BetterAuthInstance> {
  const secret = requiredEnvironmentValue('BETTER_AUTH_SECRET');
  const baseURL = requiredEnvironmentValue('BETTER_AUTH_URL');
  const googleClientId = requiredEnvironmentValue('GOOGLE_CLIENT_ID');
  const googleClientSecret = requiredEnvironmentValue('GOOGLE_CLIENT_SECRET');

  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters`,
    );
  }

  new URL(baseURL);

  const { betterAuth } = await import('better-auth');
  const { APIError, createAuthMiddleware } = await import('better-auth/api');
  const { prismaAdapter } = await import('@better-auth/prisma-adapter');

  return betterAuth({
    appName: 'Auto Parts Marketplace',
    baseURL,
    secret,
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
    },
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        allowDifferentEmails: false,
        updateUserInfoOnLink: false,
      },
    },
    hooks: {
      before: createAuthMiddleware((context) => {
        if (context.path === '/change-password' && context.body) {
          context.body.revokeOtherSessions = true;
        }

        return Promise.resolve();
      }),
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { isActive: true },
            });

            if (user && !user.isActive) {
              throw new APIError('FORBIDDEN', {
                message: 'User account is inactive',
              });
            }

            return { data: session };
          },
        },
      },
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
    user: {
      additionalFields: {
        role: {
          type: ['CUSTOMER', 'SUPPLIER_USER', 'SUPPORT_MANAGER', 'ADMIN'],
          required: true,
          defaultValue: 'CUSTOMER',
          input: false,
        },
        isActive: {
          type: 'boolean',
          required: true,
          defaultValue: true,
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: false,
      },
    },
    advanced: {
      database: {
        generateId: 'uuid',
      },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  }) as BetterAuthInstance;
}
