import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { BETTER_AUTH, BETTER_AUTH_NODE_HANDLER } from './auth.constants';
import { createBetterAuth } from './auth.factory';
import { AuthPasswordController } from './auth-password.controller';
import { AuthPasswordService } from './auth-password.service';
import { AuthSessionService } from './auth-session.service';
import { BetterAuthInstance, BetterAuthNodeHandler } from './auth.types';
import { RolesGuard } from './guards/roles.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { SupplierOwnershipGuard } from './guards/supplier-ownership.guard';
import { SupplierMembershipController } from './supplier-membership/supplier-membership.controller';
import { SupplierMembershipService } from './supplier-membership/supplier-membership.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthPasswordController, SupplierMembershipController],
  providers: [
    AuthPasswordService,
    AuthSessionService,
    SupplierMembershipService,
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
