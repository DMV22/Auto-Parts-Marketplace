import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentSupplierMembershipDto } from './supplier-membership.types';

@Injectable()
export class SupplierMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(userId: string): Promise<CurrentSupplierMembershipDto> {
    const membership = await this.prisma.supplierUser.findUnique({
      where: { userId },
      select: {
        status: true,
        supplier: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return { data: membership };
  }
}
