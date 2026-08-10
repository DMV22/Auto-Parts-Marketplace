import { SetMetadata } from '@nestjs/common';

export const SUPPLIER_ID_PARAM_METADATA_KEY = 'auth:supplier-id-param';

export const SupplierOwned = (
  supplierIdParameter = 'supplierId',
): MethodDecorator & ClassDecorator =>
  SetMetadata(SUPPLIER_ID_PARAM_METADATA_KEY, supplierIdParameter);
