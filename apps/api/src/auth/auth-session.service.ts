import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async blockUser(userId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      await transaction.session.deleteMany({ where: { userId } });
    });
  }
}
