/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureAuthHttp } from './auth/configure-auth-http';
import { validateApiEnvironment } from './config/environment';

async function bootstrap() {
  const environment = validateApiEnvironment();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureAuthHttp(app);
  app.enableShutdownHooks();
  await app.listen(environment.port);
}
bootstrap();
