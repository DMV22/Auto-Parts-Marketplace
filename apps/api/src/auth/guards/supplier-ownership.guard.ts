import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupplierUserStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../auth.types';
import { SUPPLIER_ID_PARAM_METADATA_KEY } from '../decorators/supplier-owned.decorator';

@Injectable()
export class SupplierOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.auth?.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role !== UserRole.SUPPLIER_USER) {
      return false;
    }

    const supplierIdParameter =
      this.reflector.getAllAndOverride<string>(SUPPLIER_ID_PARAM_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'supplierId';
    const supplierId = request.params[supplierIdParameter];

    if (!supplierId) {
      return false;
    }

    const membership = await this.prisma.supplierUser.findUnique({
      where: { userId: user.id },
      select: { supplierId: true, status: true },
    });

    return (
      membership?.status === SupplierUserStatus.ACTIVE &&
      membership.supplierId === supplierId
    );
  }
}
