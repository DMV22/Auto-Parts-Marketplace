export const DEMO_SEED_VERSION = '2026-09-catalog-commerce-v2';

export const demoSeedCounts = {
  users: 14,
  customerProfiles: 3,
  suppliers: 8,
  supplierUsers: 9,
  categories: 8,
  brands: 12,
  products: 36,
  productVariants: 216,
  vehicleMakes: 6,
  vehicleModels: 18,
  vehicleGenerations: 36,
  engineTypes: 72,
  fitmentRules: 264,
  savedVehicles: 6,
  listings: 360,
  carts: 2,
  cartItems: 5,
  orders: 30,
  orderItems: 60,
  paymentEvents: 25,
  orderStatusEvents: 92,
  returnRequests: 12,
  notes: 20,
  activityLogs: 96,
} as const;

const UUID_NAMESPACES = {
  user: '10000000',
  customerProfile: '11000000',
  supplier: '20000000',
  supplierUser: '21000000',
  category: '30000000',
  brand: '31000000',
  product: '32000000',
  productVariant: '33000000',
  vehicleMake: '40000000',
  vehicleModel: '41000000',
  vehicleGeneration: '42000000',
  engineType: '43000000',
  fitmentRule: '44000000',
  savedVehicle: '45000000',
  listing: '50000000',
  cart: '51000000',
  cartItem: '52000000',
  order: '60000000',
  orderItem: '61000000',
  paymentEvent: '62000000',
  returnRequest: '63000000',
  orderStatusEvent: '64000000',
  note: '65000000',
  activityLog: '66000000',
  checkoutRequest: '67000000',
} as const;

export type DemoEntity = keyof typeof UUID_NAMESPACES;

export function demoId(entity: DemoEntity, index: number): string {
  if (!Number.isInteger(index) || index < 1 || index > 999_999_999_999) {
    throw new Error(`Invalid demo fixture index for ${entity}: ${index}`);
  }

  return `${UUID_NAMESPACES[entity]}-0000-4000-8000-${index
    .toString()
    .padStart(12, '0')}`;
}

export function demoKey(scope: string, index: number, width = 3): string {
  return `${scope}.${index.toString().padStart(width, '0')}`;
}

export const demoActorKeys = {
  customerPrimary: 'actor.customer.primary',
  customerSecondary: 'actor.customer.secondary',
  customerForeign: 'actor.customer.foreign',
  supplier: Array.from(
    { length: demoSeedCounts.suppliers },
    (_, index) => `actor.supplier.${(index + 1).toString().padStart(2, '0')}`,
  ),
  supplierInactive: 'actor.supplier.inactive',
  supportPrimary: 'actor.support.primary',
  adminPrimary: 'actor.admin.primary',
} as const;

export const demoResourceKeys = {
  suppliers: Array.from({ length: demoSeedCounts.suppliers }, (_, index) =>
    demoKey('supplier', index + 1, 2),
  ),
  products: Array.from({ length: demoSeedCounts.products }, (_, index) =>
    demoKey('catalog.product', index + 1),
  ),
  productVariants: Array.from(
    { length: demoSeedCounts.productVariants },
    (_, index) => demoKey('catalog.variant', index + 1),
  ),
  listings: Array.from({ length: demoSeedCounts.listings }, (_, index) =>
    demoKey('catalog.listing', index + 1),
  ),
  orders: Array.from({ length: demoSeedCounts.orders }, (_, index) =>
    demoKey('commerce.order', index + 1),
  ),
  returnRequests: Array.from(
    { length: demoSeedCounts.returnRequests },
    (_, index) => demoKey('ops.return', index + 1),
  ),
} as const;
