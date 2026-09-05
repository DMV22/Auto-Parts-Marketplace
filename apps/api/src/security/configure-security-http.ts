import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export function configureSecurityHttp(app: INestApplication): void {
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
}
