import { INestApplication } from '@nestjs/common';
import { BETTER_AUTH_NODE_HANDLER } from './auth.constants';
import { BetterAuthNodeHandler } from './auth.types';

type ExpressApplication = {
  all: (path: string, handler: BetterAuthNodeHandler) => void;
};

type BodyParserApplication = INestApplication & {
  useBodyParser: (type: 'json' | 'urlencoded', options?: object) => unknown;
};

export function configureAuthHttp(app: INestApplication): void {
  const express = app.getHttpAdapter().getInstance() as ExpressApplication;
  const authHandler = app.get<BetterAuthNodeHandler>(BETTER_AUTH_NODE_HANDLER);
  const bodyParserApp = app as BodyParserApplication;

  express.all('/api/auth/*splat', authHandler);
  bodyParserApp.useBodyParser('json');
  bodyParserApp.useBodyParser('urlencoded', { extended: true });
}
