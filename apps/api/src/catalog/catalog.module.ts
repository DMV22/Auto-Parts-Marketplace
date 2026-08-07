import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogSessionService } from './catalog-session.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogSessionService],
  exports: [CatalogService],
})
export class CatalogModule {}
