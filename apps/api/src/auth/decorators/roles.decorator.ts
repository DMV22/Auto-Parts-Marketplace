import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';

export const ROLES_METADATA_KEY = 'auth:roles';

export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);
