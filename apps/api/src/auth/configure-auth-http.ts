import { INestApplication } from '@nestjs/common';
import { BETTER_AUTH_NODE_HANDLER } from './auth.constants';
import { BetterAuthNodeHandler } from './auth.types';

type ExpressApplication = {
  all: (path: string, handler: BetterAuthNodeHandler) => void;
};

type BodyParserApplication = INestApplication & {
  useBodyParser: (type: 'json' | 'urlencoded', options?: object) => unknown;
};

type RawBodyRequest = {
  originalUrl?: string;
  rawBody?: Buffer;
};

export function configureAuthHttp(app: INestApplication): void {
  const express = app.getHttpAdapter().getInstance() as ExpressApplication;
  const authHandler = app.get<BetterAuthNodeHandler>(BETTER_AUTH_NODE_HANDLER);
  const bodyParserApp = app as BodyParserApplication;

  express.all('/api/auth/*splat', authHandler);
  bodyParserApp.useBodyParser('json', {
    verify: (request: RawBodyRequest, _response: unknown, body: Buffer) => {
      if (request.originalUrl?.startsWith('/api/v1/webhooks/stripe')) {
        request.rawBody = Buffer.from(body);
      }
    },
  });
  bodyParserApp.useBodyParser('urlencoded', { extended: true });
}
