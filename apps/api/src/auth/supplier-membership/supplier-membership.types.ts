import type { SupplierUserStatus } from '../../generated/prisma/enums';

export type CurrentSupplierMembershipDto = {
  data: {
    status: SupplierUserStatus;
    supplier: {
      id: string;
      name: string;
      slug: string;
    };
  } | null;
};
