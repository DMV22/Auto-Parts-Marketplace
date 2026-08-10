/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureAuthHttp } from './auth/configure-auth-http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureAuthHttp(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
