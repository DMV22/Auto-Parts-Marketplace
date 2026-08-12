import type { ListingCondition } from '../../generated/prisma/enums';
import type {
  FitmentAnswer,
  VehicleContextInput,
} from '../fitment/fitment.types';

export type ProductDetailQuery = VehicleContextInput;

export type ProductDetailResponse = {
  data: {
    id: string;
    name: string;
    description: string | null;
    brand: { id: string; name: string };
    category: { id: string; name: string } | null;
    variants: Array<{
      id: string;
      sku: string;
      manufacturerPartNumber: string;
      oemNumber: string | null;
      fitment: FitmentAnswer;
      listings: Array<{
        id: string;
        condition: ListingCondition;
        price: string;
        currency: string;
        inStock: boolean;
        supplier: { id: string; name: string; slug: string };
      }>;
    }>;
  };
};
