import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommerceActorService } from './commerce-actor.service';
import { GuestCartContextService } from './guest-cart-context.service';

@Module({
  imports: [AuthModule],
  providers: [CommerceActorService, GuestCartContextService],
  exports: [CommerceActorService, GuestCartContextService],
})
export class CommerceModule {}
