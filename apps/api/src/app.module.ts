import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { VehicleTaxonomyModule } from './vehicle-taxonomy/vehicle-taxonomy.module';

@Module({
  imports: [PrismaModule, AuthModule, VehicleTaxonomyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
