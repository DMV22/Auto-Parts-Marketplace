export type AddCartItemInput = {
  listingId: string;
  quantity: number;
};

export type UpdateCartItemInput = {
  quantity: number;
};

export type CartAvailabilityIssue =
  | 'LISTING_UNAVAILABLE'
  | 'INSUFFICIENT_STOCK'
  | 'CURRENCY_MISMATCH';

export type CartView = {
  id: string | null;
  currency: string | null;
  totalQuantity: number;
  totalAmount: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    available: boolean;
    issues: CartAvailabilityIssue[];
    listing: {
      id: string;
      condition: 'NEW' | 'USED' | 'REMANUFACTURED';
      currency: string;
      inStock: boolean;
      productVariant: {
        id: string;
        sku: string;
        product: { id: string; name: string };
      };
      supplier: { id: string; name: string; slug: string };
    };
  }>;
};

export type CartResponse = { data: CartView };
