import { IncomingMessage, ServerResponse } from 'node:http';
import { Request as ExpressRequest } from 'express';
import { UserRole } from '../generated/prisma/enums';

export type AuthSession = {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
  };
};

export type BetterAuthInstance = {
  handler: (request: globalThis.Request) => Promise<Response>;
  api: {
    getSession: (input: { headers: Headers }) => Promise<AuthSession | null>;
  };
};

export type BetterAuthPasswordInstance = BetterAuthInstance & {
  api: BetterAuthInstance['api'] & {
    setPassword: (input: {
      body: { newPassword: string };
      headers: Headers;
    }) => Promise<{ status: true }>;
  };
};

export type AuthenticatedRequest = ExpressRequest & {
  auth?: AuthSession;
};

export type BetterAuthNodeHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>;
