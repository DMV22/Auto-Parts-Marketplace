import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { BETTER_AUTH, BETTER_AUTH_NODE_HANDLER } from './auth.constants';
import { createBetterAuth } from './auth.factory';
import { AuthSessionService } from './auth-session.service';
import { BetterAuthInstance, BetterAuthNodeHandler } from './auth.types';
import { RolesGuard } from './guards/roles.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { SupplierOwnershipGuard } from './guards/supplier-ownership.guard';

@Module({
  imports: [PrismaModule],
  providers: [
    AuthSessionService,
    SessionAuthGuard,
    RolesGuard,
    SupplierOwnershipGuard,
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
  exports: [
    AuthSessionService,
    SessionAuthGuard,
    RolesGuard,
    SupplierOwnershipGuard,
    BETTER_AUTH,
    BETTER_AUTH_NODE_HANDLER,
  ],
})
export class AuthModule {}
