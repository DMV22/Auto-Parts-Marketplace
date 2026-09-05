import {
  demoActorKeys,
  demoId,
  demoKey,
  demoSeedCounts,
} from './seed-manifest';

type UserRole = 'CUSTOMER' | 'SUPPLIER_USER' | 'SUPPORT_MANAGER' | 'ADMIN';
type SupplierUserStatus = 'ACTIVE' | 'DISABLED';
type ListingStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'PAUSED'
  | 'REJECTED'
  | 'ARCHIVED';
type ListingCondition = 'NEW' | 'USED' | 'REMANUFACTURED';
type FitmentRuleEffect = 'COMPATIBLE' | 'INCOMPATIBLE';
type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';
type PaymentEventStatus = 'RECEIVED' | 'PROCESSED' | 'FAILED';
type OrderStatusEventSource =
  | 'CHECKOUT'
  | 'STRIPE_WEBHOOK'
  | 'SYSTEM'
  | 'INTERNAL_OPS';
type ReturnRequestStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';
type ActivityResourceType = 'ORDER' | 'RETURN_REQUEST' | 'LISTING' | 'NOTE';

const BASE_TIME = Date.parse('2026-01-05T09:00:00.000Z');

function timestamp(offsetMinutes: number): string {
  return new Date(BASE_TIME + offsetMinutes * 60_000).toISOString();
}

function assertCount(
  name: keyof typeof demoSeedCounts,
  records: readonly unknown[],
): void {
  const expected = demoSeedCounts[name];

  if (records.length !== expected) {
    throw new Error(
      `Demo seed manifest mismatch for ${name}: expected ${expected}, received ${records.length}`,
    );
  }
}

const supplierNames = [
  'Demo Parts Hub',
  'Demo Motor Supply',
  'Demo Brake Works',
  'Demo Filter Depot',
  'Demo Ignition Lab',
  'Demo Chassis Market',
  'Demo Cooling Point',
  'Demo Electric Garage',
] as const;

const supplierSlugs = [
  'demo-parts-hub',
  'demo-motor-supply',
  'demo-brake-works',
  'demo-filter-depot',
  'demo-ignition-lab',
  'demo-chassis-market',
  'demo-cooling-point',
  'demo-electric-garage',
] as const;

export const demoUsers: Array<{
  fixtureKey: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
}> = [
  {
    fixtureKey: demoActorKeys.customerPrimary,
    id: demoId('user', 1),
    name: 'Demo Customer Primary',
    email: 'customer.demo@auto-parts.local',
    role: 'CUSTOMER',
  },
  {
    fixtureKey: demoActorKeys.supplier[0],
    id: demoId('user', 2),
    name: 'Demo Supplier Alpha',
    email: 'supplier.alpha@auto-parts.local',
    role: 'SUPPLIER_USER',
  },
  {
    fixtureKey: demoActorKeys.supplier[1],
    id: demoId('user', 3),
    name: 'Demo Supplier Beta',
    email: 'supplier.beta@auto-parts.local',
    role: 'SUPPLIER_USER',
  },
  {
    fixtureKey: demoActorKeys.supportPrimary,
    id: demoId('user', 4),
    name: 'Demo Support Manager',
    email: 'support.demo@auto-parts.local',
    role: 'SUPPORT_MANAGER',
  },
  {
    fixtureKey: demoActorKeys.adminPrimary,
    id: demoId('user', 5),
    name: 'Demo Admin',
    email: 'admin.demo@auto-parts.local',
    role: 'ADMIN',
  },
  {
    fixtureKey: demoActorKeys.customerSecondary,
    id: demoId('user', 6),
    name: 'Demo Customer Secondary',
    email: 'customer.secondary@auto-parts.local',
    role: 'CUSTOMER',
  },
  {
    fixtureKey: demoActorKeys.customerForeign,
    id: demoId('user', 7),
    name: 'Demo Customer Foreign',
    email: 'customer.foreign@auto-parts.local',
    role: 'CUSTOMER',
  },
  ...Array.from({ length: 6 }, (_, offset) => {
    const supplierNumber = offset + 3;
    return {
      fixtureKey: demoActorKeys.supplier[supplierNumber - 1],
      id: demoId('user', offset + 8),
      name: `Demo Supplier User ${supplierNumber.toString().padStart(2, '0')}`,
      email: `supplier.${supplierNumber.toString().padStart(2, '0')}@auto-parts.local`,
      role: 'SUPPLIER_USER' as const,
    };
  }),
  {
    fixtureKey: demoActorKeys.supplierInactive,
    id: demoId('user', 14),
    name: 'Demo Supplier Inactive',
    email: 'supplier.inactive@auto-parts.local',
    role: 'SUPPLIER_USER',
  },
];

export const demoCustomerProfiles = [1, 6, 7].map((userIndex, index) => ({
  id: demoId('customerProfile', index + 1),
  userEmail: demoUsers[userIndex - 1].email,
  phone: null,
}));

export const demoSuppliers = supplierNames.map((name, index) => ({
  fixtureKey: demoKey('supplier', index + 1, 2),
  id: demoId('supplier', index + 1),
  name,
  slug: supplierSlugs[index],
}));

export const demoSupplierUsers: Array<{
  id: string;
  userEmail: string;
  supplierSlug: string;
  status: SupplierUserStatus;
}> = [
  {
    id: demoId('supplierUser', 1),
    userEmail: 'supplier.alpha@auto-parts.local',
    supplierSlug: supplierSlugs[0],
    status: 'ACTIVE',
  },
  {
    id: demoId('supplierUser', 2),
    userEmail: 'supplier.beta@auto-parts.local',
    supplierSlug: supplierSlugs[1],
    status: 'ACTIVE',
  },
  ...Array.from({ length: 6 }, (_, offset) => ({
    id: demoId('supplierUser', offset + 3),
    userEmail: `supplier.${(offset + 3).toString().padStart(2, '0')}@auto-parts.local`,
    supplierSlug: supplierSlugs[offset + 2],
    status: 'ACTIVE' as const,
  })),
  {
    id: demoId('supplierUser', 9),
    userEmail: 'supplier.inactive@auto-parts.local',
    supplierSlug: supplierSlugs[0],
    status: 'DISABLED',
  },
];

const categoryNames = [
  'Brakes',
  'Filters',
  'Ignition',
  'Suspension',
  'Steering',
  'Cooling',
  'Electrical',
  'Exhaust',
] as const;

const brandNames = [
  'Bosch',
  'MANN-FILTER',
  'Brembo',
  'NGK',
  'Sachs',
  'Febi',
  'Denso',
  'Valeo',
  'SKF',
  'Mahle',
  'TRW',
  'Gates',
] as const;

export const demoCategories = categoryNames.map((name, index) => ({
  id: demoId('category', index + 1),
  name,
}));

export const demoBrands = brandNames.map((name, index) => ({
  id: demoId('brand', index + 1),
  name,
}));

const productNames = [
  'Front Brake Pad Set',
  'Engine Oil Filter',
  'Engine Air Filter',
  'Rear Brake Pad Set',
  'Front Brake Disc',
  'Rear Brake Disc',
  'Cabin Air Filter',
  'Fuel Filter',
  'Spark Plug Set',
  'Ignition Coil',
  'Front Shock Absorber',
  'Rear Shock Absorber',
  'Control Arm',
  'Stabilizer Link',
  'Tie Rod End',
  'Steering Rack Boot',
  'Water Pump',
  'Engine Thermostat',
  'Radiator Hose',
  'Cooling Fan',
  'Alternator Pulley',
  'Starter Solenoid',
  'Battery Sensor',
  'Headlamp Bulb Set',
  'Exhaust Mount',
  'Oxygen Sensor',
  'Timing Belt Kit',
  'Accessory Belt',
  'Wheel Bearing Kit',
  'Clutch Release Bearing',
  'Brake Wear Sensor',
  'Mass Air Flow Sensor',
  'Engine Mount',
  'Transmission Mount',
  'Glow Plug Set',
  'EGR Valve Gasket',
] as const;

export const demoProducts = productNames.map((name, index) => {
  const legacy = [
    {
      description: 'Synthetic front axle brake pad set for demo scenarios.',
      categoryName: 'Brakes',
      brandName: 'Bosch',
    },
    {
      description: 'Synthetic spin-on oil filter for demo scenarios.',
      categoryName: 'Filters',
      brandName: 'MANN-FILTER',
    },
    {
      description: 'Synthetic panel air filter for demo scenarios.',
      categoryName: 'Filters',
      brandName: 'Bosch',
    },
  ][index];

  return {
    fixtureKey: demoKey('catalog.product', index + 1),
    id: demoId('product', index + 1),
    name,
    description:
      legacy?.description ??
      `Synthetic ${name.toLowerCase()} for deterministic local development.`,
    categoryName:
      legacy?.categoryName ?? categoryNames[index % categoryNames.length],
    brandName: legacy?.brandName ?? brandNames[index % brandNames.length],
  };
});

const legacyVariants = [
  [1, 'DEMO-BOSCH-BP-001', '0 986 494 001', 'DEMO-OEM-BP-001'],
  [1, 'DEMO-BOSCH-BP-002', '0 986 494 002', 'DEMO-OEM-BP-002'],
  [2, 'DEMO-MANN-OF-003', 'W 712/95', 'DEMO-OEM-OF-003'],
  [3, 'DEMO-BOSCH-AF-004', 'F 026 400 004', 'DEMO-OEM-AF-004'],
] as const;

export const demoProductVariants = [
  ...legacyVariants.map((variant, index) => ({
    fixtureKey: demoKey('catalog.variant', index + 1),
    id: demoId('productVariant', index + 1),
    productId: demoId('product', variant[0]),
    sku: variant[1],
    manufacturerPartNumber: variant[2],
    oemNumber: variant[3] as string | null,
  })),
  ...Array.from(
    { length: demoSeedCounts.productVariants - legacyVariants.length },
    (_, offset) => {
      const index = offset + legacyVariants.length + 1;
      return {
        fixtureKey: demoKey('catalog.variant', index),
        id: demoId('productVariant', index),
        productId: demoId(
          'product',
          ((index - 1) % demoSeedCounts.products) + 1,
        ),
        sku: `DEMO-VAR-${index.toString().padStart(3, '0')}`,
        manufacturerPartNumber: `DEMO-MPN-${index.toString().padStart(4, '0')}`,
        oemNumber:
          index % 5 === 0
            ? null
            : `DEMO-OEM-${index.toString().padStart(4, '0')}`,
      };
    },
  ),
];

const makeNames = [
  'Toyota',
  'Volkswagen',
  'BMW',
  'Ford',
  'Renault',
  'Skoda',
] as const;

export const demoVehicleMakes = makeNames.map((name, index) => ({
  id: demoId('vehicleMake', index + 1),
  name,
}));

const vehicleModelBlueprints = [
  ['Toyota', 'Corolla'],
  ['Volkswagen', 'Golf'],
  ['Toyota', 'Camry'],
  ['Toyota', 'RAV4'],
  ['Volkswagen', 'Passat'],
  ['Volkswagen', 'Tiguan'],
  ['BMW', '3 Series'],
  ['BMW', '5 Series'],
  ['BMW', 'X3'],
  ['Ford', 'Focus'],
  ['Ford', 'Mondeo'],
  ['Ford', 'Kuga'],
  ['Renault', 'Megane'],
  ['Renault', 'Clio'],
  ['Renault', 'Duster'],
  ['Skoda', 'Octavia'],
  ['Skoda', 'Superb'],
  ['Skoda', 'Kodiaq'],
] as const;

export const demoVehicleModels = vehicleModelBlueprints.map((model, index) => ({
  id: demoId('vehicleModel', index + 1),
  makeName: model[0],
  name: model[1],
}));

const generationBlueprints: Array<{
  modelKey: string;
  code: string;
  name: string;
  yearFrom: number;
  yearTo: number;
}> = [
  {
    modelKey: 'Toyota:Corolla',
    code: 'E210',
    name: 'Corolla E210',
    yearFrom: 2018,
    yearTo: 2024,
  },
  {
    modelKey: 'Volkswagen:Golf',
    code: 'MK7',
    name: 'Golf Mk7',
    yearFrom: 2012,
    yearTo: 2020,
  },
];

for (const [makeName, modelName] of vehicleModelBlueprints) {
  const modelKey = `${makeName}:${modelName}`;
  const codes =
    modelKey === 'Toyota:Corolla'
      ? ['E170']
      : modelKey === 'Volkswagen:Golf'
        ? ['MK8']
        : ['G1', 'G2'];
  for (const [slot, code] of codes.entries()) {
    generationBlueprints.push({
      modelKey,
      code,
      name: `${modelName} ${code}`,
      yearFrom: slot === 0 ? 2011 : 2018,
      yearTo: slot === 0 ? 2018 : 2026,
    });
  }
}

export const demoVehicleGenerations = generationBlueprints.map(
  (generation, index) => ({
    id: demoId('vehicleGeneration', index + 1),
    ...generation,
  }),
);

const engineBlueprints: Array<{
  generationKey: string;
  code: string;
  name: string;
}> = [
  { generationKey: 'Toyota:Corolla:E210', code: '2ZR-FXE', name: '1.8 Hybrid' },
  {
    generationKey: 'Toyota:Corolla:E210',
    code: 'M20A-FKS',
    name: '2.0 Petrol',
  },
  { generationKey: 'Volkswagen:Golf:MK7', code: 'CZCA', name: '1.4 TSI' },
  { generationKey: 'Volkswagen:Golf:MK7', code: 'CRBC', name: '2.0 TDI' },
];

for (const generation of demoVehicleGenerations.slice(2)) {
  const generationKey = `${generation.modelKey}:${generation.code}`;
  const ordinal = engineBlueprints.length + 1;
  engineBlueprints.push(
    {
      generationKey,
      code: `PET-${ordinal.toString().padStart(3, '0')}`,
      name: ordinal % 3 === 0 ? '1.6 Petrol' : '2.0 Petrol',
    },
    {
      generationKey,
      code: `DSL-${(ordinal + 1).toString().padStart(3, '0')}`,
      name: ordinal % 4 === 0 ? '1.5 Diesel' : '2.0 Diesel',
    },
  );
}

export const demoEngineTypes = engineBlueprints.map((engine, index) => ({
  id: demoId('engineType', index + 1),
  ...engine,
}));

const enginesByGeneration = new Map<string, typeof demoEngineTypes>();
for (const engine of demoEngineTypes) {
  const engines = enginesByGeneration.get(engine.generationKey) ?? [];
  engines.push(engine);
  enginesByGeneration.set(engine.generationKey, engines);
}

const fitmentBlueprints: Array<{
  variantSku: string;
  generationKey: string;
  engineKey: string | null;
  effect: FitmentRuleEffect;
}> = [
  [
    'DEMO-BOSCH-BP-001',
    'Toyota:Corolla:E210',
    'Toyota:Corolla:E210:2ZR-FXE',
    'COMPATIBLE',
  ],
  [
    'DEMO-BOSCH-BP-001',
    'Toyota:Corolla:E210',
    'Toyota:Corolla:E210:M20A-FKS',
    'COMPATIBLE',
  ],
  [
    'DEMO-BOSCH-BP-002',
    'Volkswagen:Golf:MK7',
    'Volkswagen:Golf:MK7:CZCA',
    'COMPATIBLE',
  ],
  [
    'DEMO-MANN-OF-003',
    'Toyota:Corolla:E210',
    'Toyota:Corolla:E210:2ZR-FXE',
    'COMPATIBLE',
  ],
  [
    'DEMO-MANN-OF-003',
    'Volkswagen:Golf:MK7',
    'Volkswagen:Golf:MK7:CRBC',
    'COMPATIBLE',
  ],
].map(([variantSku, generationKey, engineKey, effect]) => ({
  variantSku,
  generationKey,
  engineKey,
  effect: effect as FitmentRuleEffect,
}));

function fitmentContext(variantIndex: number) {
  const generation =
    demoVehicleGenerations[(variantIndex - 1) % demoVehicleGenerations.length];
  const generationKey = `${generation.modelKey}:${generation.code}`;
  const engines = enginesByGeneration.get(generationKey);
  if (!engines || engines.length !== 2)
    throw new Error(`Expected two demo engines for ${generationKey}`);
  return { generationKey, engines };
}

for (let variantIndex = 5; variantIndex <= 74; variantIndex += 1) {
  const { generationKey } = fitmentContext(variantIndex);
  fitmentBlueprints.push({
    variantSku: demoProductVariants[variantIndex - 1].sku,
    generationKey,
    engineKey: null,
    effect: 'COMPATIBLE',
  });
}
for (let variantIndex = 75; variantIndex <= 121; variantIndex += 1) {
  const { generationKey, engines } = fitmentContext(variantIndex);
  fitmentBlueprints.push(
    {
      variantSku: demoProductVariants[variantIndex - 1].sku,
      generationKey,
      engineKey: null,
      effect: 'COMPATIBLE',
    },
    {
      variantSku: demoProductVariants[variantIndex - 1].sku,
      generationKey,
      engineKey: `${engines[1].generationKey}:${engines[1].code}`,
      effect: 'INCOMPATIBLE',
    },
  );
}
for (let variantIndex = 122; variantIndex <= 168; variantIndex += 1) {
  const { generationKey, engines } = fitmentContext(variantIndex);
  fitmentBlueprints.push(
    {
      variantSku: demoProductVariants[variantIndex - 1].sku,
      generationKey,
      engineKey: `${engines[0].generationKey}:${engines[0].code}`,
      effect: 'COMPATIBLE',
    },
    {
      variantSku: demoProductVariants[variantIndex - 1].sku,
      generationKey,
      engineKey: `${engines[1].generationKey}:${engines[1].code}`,
      effect: 'INCOMPATIBLE',
    },
  );
}
{
  const variantIndex = 169;
  const { generationKey, engines } = fitmentContext(variantIndex);
  fitmentBlueprints.push({
    variantSku: demoProductVariants[variantIndex - 1].sku,
    generationKey,
    engineKey: `${engines[0].generationKey}:${engines[0].code}`,
    effect: 'COMPATIBLE',
  });
}

export const demoFitmentRules = fitmentBlueprints.map((fitment, index) => ({
  id: demoId('fitmentRule', index + 1),
  ...fitment,
}));

export const demoSavedVehicles = Array.from({ length: 6 }, (_, index) => {
  const customerEmails = [
    'customer.demo@auto-parts.local',
    'customer.secondary@auto-parts.local',
    'customer.foreign@auto-parts.local',
  ];
  const generation = demoVehicleGenerations[index * 3];
  const generationKey = `${generation.modelKey}:${generation.code}`;
  const engine = enginesByGeneration.get(generationKey)?.[index % 2];
  if (!engine)
    throw new Error(`Missing saved-vehicle engine for ${generationKey}`);
  return {
    fixtureKey: demoKey('garage.saved-vehicle', index + 1),
    id: demoId('savedVehicle', index + 1),
    userEmail: customerEmails[Math.floor(index / 2)],
    generationKey,
    engineKey: `${engine.generationKey}:${engine.code}`,
    year: Math.min(generation.yearTo, generation.yearFrom + 2),
    label: index % 2 === 0 ? 'Primary demo vehicle' : 'Secondary demo vehicle',
    isActive: index % 2 === 0,
    createdAt: timestamp(100 + index),
  };
});

const listingStatuses: ListingStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'ACTIVE',
  'PAUSED',
  'REJECTED',
  'ARCHIVED',
  ...Array<ListingStatus>(239).fill('ACTIVE'),
  ...Array<ListingStatus>(35).fill('DRAFT'),
  ...Array<ListingStatus>(29).fill('PENDING_APPROVAL'),
  ...Array<ListingStatus>(23).fill('PAUSED'),
  ...Array<ListingStatus>(17).fill('REJECTED'),
  ...Array<ListingStatus>(11).fill('ARCHIVED'),
];
const activeListingIndexes = listingStatuses
  .map((status, index) => ({ status, index }))
  .filter(({ status }) => status === 'ACTIVE')
  .map(({ index }) => index);
const nonActiveListingIndexes = listingStatuses
  .map((status, index) => ({ status, index }))
  .filter(({ status }) => status !== 'ACTIVE')
  .map(({ index }) => index);
const zeroStockIndexes = new Set([
  ...activeListingIndexes.slice(0, 24),
  ...nonActiveListingIndexes.slice(0, 12),
]);
const lowStockIndexes = new Set([
  ...activeListingIndexes.slice(24, 72),
  ...nonActiveListingIndexes.slice(12, 36),
]);
const legacyVariantIndexes = [1, 2, 3, 4, 1, 3];
let activeCurrencyIndex = 0;
let nonActiveCurrencyIndex = 0;

export const demoListings = listingStatuses.map((status, arrayIndex) => {
  const index = arrayIndex + 1;
  const isActive = status === 'ACTIVE';
  const currencyIndex = isActive
    ? activeCurrencyIndex++
    : nonActiveCurrencyIndex++;
  const currency = isActive
    ? currencyIndex < 180
      ? 'UAH'
      : currencyIndex < 216
        ? 'EUR'
        : 'USD'
    : currencyIndex < 90
      ? 'UAH'
      : currencyIndex < 108
        ? 'EUR'
        : 'USD';
  const condition: ListingCondition =
    index <= 216 ? 'NEW' : index <= 306 ? 'USED' : 'REMANUFACTURED';
  const stockQuantity = zeroStockIndexes.has(arrayIndex)
    ? 0
    : lowStockIndexes.has(arrayIndex)
      ? 1 + (index % 3)
      : 8 + (index % 93);
  const variantIndex =
    legacyVariantIndexes[arrayIndex] ??
    ((index - 1) % demoSeedCounts.productVariants) + 1;
  const priceBase = 125 + ((index * 137) % 14_000);
  const price =
    currency === 'UAH'
      ? `${priceBase}.00`
      : currency === 'EUR'
        ? `${20 + (priceBase % 480)}.00`
        : `${25 + (priceBase % 575)}.00`;
  return {
    fixtureKey: demoKey('catalog.listing', index),
    id: demoId('listing', index),
    supplierSlug: supplierSlugs[(index - 1) % supplierSlugs.length],
    variantSku: demoProductVariants[variantIndex - 1].sku,
    status,
    condition,
    price,
    currency,
    stockQuantity,
    inventoryVersion: (index - 1) % 8,
    rejectionReason:
      status === 'REJECTED'
        ? `Synthetic moderation rejection ${index.toString().padStart(3, '0')}`
        : null,
    moderationReason:
      status === 'PAUSED' && index % 2 === 0
        ? `Synthetic emergency pause ${index.toString().padStart(3, '0')}`
        : null,
    createdAt: timestamp(500 + index * 3),
    updatedAt: timestamp(501 + index * 3),
  };
});

const purchasableListings = demoListings.filter(
  (listing) => listing.status === 'ACTIVE' && listing.stockQuantity > 0,
);
const uahPurchasableListings = purchasableListings.filter(
  (listing) => listing.currency === 'UAH',
);

export const demoCarts = [
  {
    fixtureKey: demoKey('commerce.cart', 1),
    id: demoId('cart', 1),
    customerEmail: 'customer.demo@auto-parts.local',
    currency: 'UAH',
    createdAt: timestamp(2_000),
  },
  {
    fixtureKey: demoKey('commerce.cart', 2),
    id: demoId('cart', 2),
    customerEmail: 'customer.secondary@auto-parts.local',
    currency: 'UAH',
    createdAt: timestamp(2_010),
  },
];

export const demoCartItems = Array.from({ length: 5 }, (_, index) => ({
  id: demoId('cartItem', index + 1),
  cartKey: demoCarts[index < 3 ? 0 : 1].fixtureKey,
  listingKey: uahPurchasableListings[index + 10].fixtureKey,
  quantity: 1 + (index % 2),
  createdAt: timestamp(2_020 + index),
}));

const orderStatuses: OrderStatus[] = [
  ...Array<OrderStatus>(5).fill('PENDING_PAYMENT'),
  ...Array<OrderStatus>(5).fill('PAID'),
  ...Array<OrderStatus>(5).fill('PROCESSING'),
  ...Array<OrderStatus>(4).fill('SHIPPED'),
  ...Array<OrderStatus>(8).fill('DELIVERED'),
  ...Array<OrderStatus>(3).fill('CANCELLED'),
];

function demoGuestHash(index: number): string {
  return index.toString(16).padStart(64, '0');
}

const productById = new Map(
  demoProducts.map((product) => [product.id, product]),
);
const variantBySku = new Map(
  demoProductVariants.map((variant) => [variant.sku, variant]),
);
const supplierBySlug = new Map(
  demoSuppliers.map((supplier) => [supplier.slug, supplier]),
);
const purchasableListingsByCurrency = new Map(
  ['UAH', 'EUR', 'USD'].map((currency) => [
    currency,
    purchasableListings.filter((listing) => listing.currency === currency),
  ]),
);

export const demoOrderItems = Array.from({ length: 60 }, (_, arrayIndex) => {
  const index = arrayIndex + 1;
  const orderIndex = Math.floor(arrayIndex / 2) + 1;
  const orderCurrency = ['UAH', 'EUR', 'USD'][(orderIndex - 1) % 3];
  const currencyListings = purchasableListingsByCurrency.get(orderCurrency);
  if (!currencyListings?.length)
    throw new Error(`Missing purchasable ${orderCurrency} demo listings`);
  const listing =
    currencyListings[
      (orderIndex * 7 + (arrayIndex % 2)) % currencyListings.length
    ];
  const variant = variantBySku.get(listing.variantSku);
  const product = variant ? productById.get(variant.productId) : undefined;
  const supplier = supplierBySlug.get(listing.supplierSlug);
  if (!variant || !product || !supplier)
    throw new Error(
      `Missing immutable snapshot dependency for order item ${index}`,
    );
  return {
    fixtureKey: demoKey('commerce.order-item', index),
    id: demoId('orderItem', index),
    orderId: demoId('order', orderIndex),
    listingKey: listing.fixtureKey,
    quantity: index % 3 === 0 ? 2 : 1,
    unitPrice: listing.price,
    currency: listing.currency,
    productName: product.name,
    sku: variant.sku,
    manufacturerPartNumber: variant.manufacturerPartNumber,
    condition: listing.condition,
    supplierName: supplier.name,
    createdAt: timestamp(3_000 + orderIndex * 20 + (index % 2)),
  };
});

export const demoOrders = orderStatuses.map((status, arrayIndex) => {
  const index = arrayIndex + 1;
  const items = demoOrderItems.filter(
    (item) => item.orderId === demoId('order', index),
  );
  const currency = items[0].currency;
  if (!items.every((item) => item.currency === currency))
    throw new Error(`Mixed currencies for demo order ${index}`);
  const totalAmount = items
    .reduce((total, item) => total + Number(item.unitPrice) * item.quantity, 0)
    .toFixed(2);
  const isHistoricalGuest = index >= 25 && index <= 27;
  const customerEmails = [
    'customer.demo@auto-parts.local',
    'customer.secondary@auto-parts.local',
    'customer.foreign@auto-parts.local',
  ];
  return {
    fixtureKey: demoKey('commerce.order', index),
    id: demoId('order', index),
    customerEmail: isHistoricalGuest
      ? null
      : customerEmails[(index - 1) % customerEmails.length],
    guestTokenHash: isHistoricalGuest ? demoGuestHash(index) : null,
    status,
    currency,
    totalAmount,
    checkoutRequestId: demoId('checkoutRequest', index),
    checkoutRequestFingerprint: (1_000 + index).toString(16).padStart(64, '0'),
    checkoutExpiresAt: timestamp(3_000 + index * 20 + 31),
    reservationReleasedAt:
      status === 'CANCELLED' ? timestamp(3_000 + index * 20 + 12) : null,
    createdAt: timestamp(3_000 + index * 20),
    updatedAt: timestamp(3_000 + index * 20 + 10),
  };
});

export const demoPaymentEvents: Array<{
  fixtureKey: string;
  id: string;
  orderId: string;
  externalEventId: string;
  eventType: string;
  status: PaymentEventStatus;
  scenario: string;
  receivedAt: string;
  processedAt: string;
}> = demoOrders
  .filter((order) => order.status !== 'PENDING_PAYMENT')
  .map((order, index) => {
    const isCancelled = order.status === 'CANCELLED';
    return {
      fixtureKey: demoKey('commerce.payment-event', index + 1),
      id: demoId('paymentEvent', index + 1),
      orderId: order.id,
      externalEventId:
        index === 0
          ? 'demo-payment-processed-001'
          : index === 1
            ? 'demo-payment-failed-001'
            : `demo-payment-${(index + 1).toString().padStart(3, '0')}`,
      eventType: isCancelled
        ? index % 2 === 0
          ? 'checkout.expired'
          : 'payment.failed'
        : 'payment.succeeded',
      status: isCancelled ? 'FAILED' : 'PROCESSED',
      scenario: isCancelled
        ? 'synthetic-cancelled-order'
        : 'synthetic-confirmed-order',
      receivedAt: timestamp(3_000 + (index + 6) * 20 + 4),
      processedAt: timestamp(3_000 + (index + 6) * 20 + 5),
    };
  });

const paymentEventByOrderId = new Map(
  demoPaymentEvents.map((event) => [event.orderId, event]),
);
const orderPaths: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PENDING_PAYMENT'],
  PAID: ['PENDING_PAYMENT', 'PAID'],
  PROCESSING: ['PENDING_PAYMENT', 'PAID', 'PROCESSING'],
  SHIPPED: ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED'],
  DELIVERED: ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
  CANCELLED: ['PENDING_PAYMENT', 'CANCELLED'],
};

export const demoOrderStatusEvents: Array<{
  fixtureKey: string;
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  source: OrderStatusEventSource;
  paymentEventId: string | null;
  createdAt: string;
}> = [];

for (const [orderIndex, order] of demoOrders.entries()) {
  const path = orderPaths[order.status];
  for (const [pathIndex, toStatus] of path.entries()) {
    const eventIndex = demoOrderStatusEvents.length + 1;
    const isPaymentTransition = toStatus === 'PAID' || toStatus === 'CANCELLED';
    demoOrderStatusEvents.push({
      fixtureKey: demoKey('commerce.timeline-event', eventIndex),
      id: demoId('orderStatusEvent', eventIndex),
      orderId: order.id,
      fromStatus: pathIndex === 0 ? null : path[pathIndex - 1],
      toStatus,
      source:
        pathIndex === 0
          ? 'CHECKOUT'
          : isPaymentTransition
            ? 'STRIPE_WEBHOOK'
            : 'INTERNAL_OPS',
      paymentEventId: isPaymentTransition
        ? (paymentEventByOrderId.get(order.id)?.id ?? null)
        : null,
      createdAt: timestamp(3_000 + (orderIndex + 1) * 20 + pathIndex * 2),
    });
  }
}

const deliveredOrderItems = demoOrderItems.filter(
  (item) =>
    demoOrders.find((order) => order.id === item.orderId)?.status ===
    'DELIVERED',
);
const guestDeliveredOrderItems = deliveredOrderItems.filter((item) =>
  Boolean(
    demoOrders.find((order) => order.id === item.orderId)?.guestTokenHash,
  ),
);
const customerDeliveredOrderItems = deliveredOrderItems.filter(
  (item) =>
    !demoOrders.find((order) => order.id === item.orderId)?.guestTokenHash,
);
const returnEligibleOrderItems = [
  ...guestDeliveredOrderItems.slice(0, 2),
  ...customerDeliveredOrderItems.slice(0, 10),
];
const returnStatuses: ReturnRequestStatus[] = [
  'REQUESTED',
  'REQUESTED',
  'UNDER_REVIEW',
  'UNDER_REVIEW',
  'APPROVED',
  'APPROVED',
  'REJECTED',
  'REJECTED',
  'RECEIVED',
  'COMPLETED',
  'COMPLETED',
  'CANCELLED',
];

export const demoReturnRequests = returnStatuses.map((status, index) => {
  const item = returnEligibleOrderItems[index];
  const order = demoOrders.find((candidate) => candidate.id === item.orderId);
  const isGuestOrder = Boolean(order?.guestTokenHash);
  const isDecided = !['REQUESTED', 'UNDER_REVIEW', 'CANCELLED'].includes(
    status,
  );
  return {
    fixtureKey: demoKey('ops.return', index + 1),
    id: demoId('returnRequest', index + 1),
    orderItemId: item.id,
    createdByUserEmail: isGuestOrder
      ? 'support.demo@auto-parts.local'
      : order?.customerEmail,
    decidedByUserEmail: isDecided
      ? index % 2 === 0
        ? 'support.demo@auto-parts.local'
        : 'admin.demo@auto-parts.local'
      : null,
    status,
    reason: `Synthetic return reason ${(index + 1).toString().padStart(2, '0')}`,
    decisionReason: isDecided
      ? `Synthetic return decision ${(index + 1).toString().padStart(2, '0')}`
      : null,
    decidedAt: isDecided ? timestamp(4_100 + index * 15 + 5) : null,
    createdAt: timestamp(4_100 + index * 15),
    updatedAt: timestamp(4_100 + index * 15 + 6),
  };
});

type DemoNote = {
  fixtureKey: string;
  id: string;
  orderId: string | null;
  returnRequestId: string | null;
  authorUserEmail: string;
  correctsNoteId: string | null;
  body: string;
  redactedAt: string | null;
  redactedByUserEmail: string | null;
  redactionReason: string | null;
  createdAt: string;
};

export const demoNotes: DemoNote[] = [];
for (let index = 1; index <= 12; index += 1) {
  const targetsReturn = index % 2 === 0;
  demoNotes.push({
    fixtureKey: demoKey('ops.note', index),
    id: demoId('note', index),
    orderId: targetsReturn ? null : demoOrders[index + 4].id,
    returnRequestId: targetsReturn
      ? demoReturnRequests[(index / 2 - 1) % demoReturnRequests.length].id
      : null,
    authorUserEmail:
      index % 3 === 0
        ? 'admin.demo@auto-parts.local'
        : 'support.demo@auto-parts.local',
    correctsNoteId: null,
    body: `Synthetic internal operational note ${index.toString().padStart(2, '0')}.`,
    redactedAt: null,
    redactedByUserEmail: null,
    redactionReason: null,
    createdAt: timestamp(4_500 + index * 10),
  });
}
for (let index = 13; index <= 16; index += 1) {
  const original = demoNotes[index - 13];
  demoNotes.push({
    ...original,
    fixtureKey: demoKey('ops.note', index),
    id: demoId('note', index),
    correctsNoteId: original.id,
    body: `Synthetic correction for note ${(index - 12).toString().padStart(2, '0')}.`,
    createdAt: timestamp(4_500 + index * 10),
  });
}
for (let index = 17; index <= 20; index += 1) {
  const targetsReturn = index % 2 === 0;
  demoNotes.push({
    fixtureKey: demoKey('ops.note', index),
    id: demoId('note', index),
    orderId: targetsReturn ? null : demoOrders[index - 5].id,
    returnRequestId: targetsReturn
      ? demoReturnRequests[(index - 17) % demoReturnRequests.length].id
      : null,
    authorUserEmail: 'support.demo@auto-parts.local',
    correctsNoteId: null,
    body: `Synthetic redacted note ${index.toString().padStart(2, '0')}.`,
    redactedAt: timestamp(4_700 + index * 10),
    redactedByUserEmail: 'admin.demo@auto-parts.local',
    redactionReason: 'Synthetic redaction for local privacy workflow.',
    createdAt: timestamp(4_500 + index * 10),
  });
}

type DemoActivityLog = {
  fixtureKey: string;
  id: string;
  actorUserEmail: string | null | undefined;
  actorRole: UserRole | null;
  resourceType: ActivityResourceType;
  resourceId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
};

export const demoActivityLogs: DemoActivityLog[] = [];
for (const [index, order] of demoOrders.entries()) {
  const path = orderPaths[order.status];
  const hasInternalActor = ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(
    order.status,
  );
  demoActivityLogs.push({
    fixtureKey: demoKey('ops.activity', demoActivityLogs.length + 1),
    id: demoId('activityLog', demoActivityLogs.length + 1),
    actorUserEmail: hasInternalActor ? 'support.demo@auto-parts.local' : null,
    actorRole: hasInternalActor ? 'SUPPORT_MANAGER' : null,
    resourceType: 'ORDER',
    resourceId: order.id,
    action: 'ORDER_STATUS_CHANGED',
    previousStatus: path.length > 1 ? path[path.length - 2] : null,
    newStatus: order.status,
    reason: null,
    metadata: { fixtureKey: order.fixtureKey },
    createdAt: timestamp(5_000 + index * 5),
  });
}
for (const [index, request] of demoReturnRequests.entries()) {
  for (let entry = 0; entry < 2; entry += 1) {
    const action =
      entry === 0
        ? 'RETURN_REQUEST_CREATED'
        : request.status === 'CANCELLED'
          ? 'RETURN_REQUEST_CANCELLED'
          : 'RETURN_REQUEST_STATUS_CHANGED';
    demoActivityLogs.push({
      fixtureKey: demoKey('ops.activity', demoActivityLogs.length + 1),
      id: demoId('activityLog', demoActivityLogs.length + 1),
      actorUserEmail:
        entry === 0
          ? request.createdByUserEmail
          : (request.decidedByUserEmail ?? request.createdByUserEmail),
      actorRole:
        entry === 0 && request.createdByUserEmail?.startsWith('customer.')
          ? 'CUSTOMER'
          : request.decidedByUserEmail === 'admin.demo@auto-parts.local'
            ? 'ADMIN'
            : 'SUPPORT_MANAGER',
      resourceType: 'RETURN_REQUEST',
      resourceId: request.id,
      action,
      previousStatus: entry === 0 ? null : 'REQUESTED',
      newStatus: entry === 0 ? 'REQUESTED' : request.status,
      reason: entry === 0 ? null : request.decisionReason,
      metadata: { fixtureKey: request.fixtureKey },
      createdAt: timestamp(5_200 + index * 10 + entry),
    });
  }
}
for (const [index, note] of demoNotes.entries()) {
  const action = note.redactedAt
    ? 'NOTE_REDACTED'
    : note.correctsNoteId
      ? 'NOTE_CORRECTION_CREATED'
      : 'NOTE_CREATED';
  demoActivityLogs.push({
    fixtureKey: demoKey('ops.activity', demoActivityLogs.length + 1),
    id: demoId('activityLog', demoActivityLogs.length + 1),
    actorUserEmail: note.redactedAt
      ? note.redactedByUserEmail
      : note.authorUserEmail,
    actorRole: note.redactedAt
      ? 'ADMIN'
      : note.authorUserEmail === 'admin.demo@auto-parts.local'
        ? 'ADMIN'
        : 'SUPPORT_MANAGER',
    resourceType: 'NOTE',
    resourceId: note.id,
    action,
    previousStatus: null,
    newStatus: null,
    reason: note.redactionReason,
    metadata: note.correctsNoteId
      ? { noteId: note.id, correctsNoteId: note.correctsNoteId }
      : { noteId: note.id },
    createdAt: timestamp(5_500 + index * 5),
  });
}
const moderationListings = [
  ...demoListings
    .filter((listing) => listing.status === 'REJECTED')
    .slice(0, 6),
  ...demoListings.filter((listing) => listing.status === 'PAUSED').slice(0, 6),
  ...demoListings.filter((listing) => listing.status === 'ACTIVE').slice(0, 10),
];
for (let index = 0; index < 22; index += 1) {
  const listing = moderationListings[index];
  const action =
    listing.status === 'REJECTED'
      ? 'LISTING_REJECTED'
      : listing.status === 'PAUSED'
        ? 'LISTING_EMERGENCY_PAUSED'
        : 'LISTING_APPROVED';
  demoActivityLogs.push({
    fixtureKey: demoKey('ops.activity', demoActivityLogs.length + 1),
    id: demoId('activityLog', demoActivityLogs.length + 1),
    actorUserEmail: 'admin.demo@auto-parts.local',
    actorRole: 'ADMIN',
    resourceType: 'LISTING',
    resourceId: listing.id,
    action,
    previousStatus:
      action === 'LISTING_EMERGENCY_PAUSED' ? 'ACTIVE' : 'PENDING_APPROVAL',
    newStatus: listing.status,
    reason: listing.rejectionReason ?? listing.moderationReason,
    metadata: { fixtureKey: listing.fixtureKey },
    createdAt: timestamp(5_700 + index * 5),
  });
}

assertCount('users', demoUsers);
assertCount('customerProfiles', demoCustomerProfiles);
assertCount('suppliers', demoSuppliers);
assertCount('supplierUsers', demoSupplierUsers);
assertCount('categories', demoCategories);
assertCount('brands', demoBrands);
assertCount('products', demoProducts);
assertCount('productVariants', demoProductVariants);
assertCount('vehicleMakes', demoVehicleMakes);
assertCount('vehicleModels', demoVehicleModels);
assertCount('vehicleGenerations', demoVehicleGenerations);
assertCount('engineTypes', demoEngineTypes);
assertCount('fitmentRules', demoFitmentRules);
assertCount('savedVehicles', demoSavedVehicles);
assertCount('listings', demoListings);
assertCount('carts', demoCarts);
assertCount('cartItems', demoCartItems);
assertCount('orders', demoOrders);
assertCount('orderItems', demoOrderItems);
assertCount('paymentEvents', demoPaymentEvents);
assertCount('orderStatusEvents', demoOrderStatusEvents);
assertCount('returnRequests', demoReturnRequests);
assertCount('notes', demoNotes);
assertCount('activityLogs', demoActivityLogs);
