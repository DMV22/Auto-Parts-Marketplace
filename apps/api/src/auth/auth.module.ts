import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { BETTER_AUTH, BETTER_AUTH_NODE_HANDLER } from './auth.constants';
import { createBetterAuth } from './auth.factory';
import { BetterAuthInstance, BetterAuthNodeHandler } from './auth.types';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: BETTER_AUTH,
      inject: [PrismaService],
      useFactory: createBetterAuth,
    },
    {
      provide: BETTER_AUTH_NODE_HANDLER,
      inject: [BETTER_AUTH],
      useFactory: async (
        auth: BetterAuthInstance,
      ): Promise<BetterAuthNodeHandler> => {
        const { toNodeHandler } = await import('better-auth/node');

        return toNodeHandler(auth);
      },
    },
  ],
  exports: [BETTER_AUTH, BETTER_AUTH_NODE_HANDLER],
})
export class AuthModule {}
