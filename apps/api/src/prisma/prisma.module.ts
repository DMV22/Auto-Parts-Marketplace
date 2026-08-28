import 'dotenv/config';
import { Global, Module } from '@nestjs/common';
import { PRISMA_DATABASE_URL } from './prisma.constants';
import { getPrismaDatabaseUrl } from './prisma-database-url';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA_DATABASE_URL,
      useFactory: getPrismaDatabaseUrl,
    },
    PrismaService,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
