import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [CommerceModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
