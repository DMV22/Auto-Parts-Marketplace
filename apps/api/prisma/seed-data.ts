export const demoUsers = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Demo Customer',
    email: 'customer.demo@auto-parts.local',
    role: 'CUSTOMER',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Demo Supplier Alpha',
    email: 'supplier.alpha@auto-parts.local',
    role: 'SUPPLIER_USER',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Demo Supplier Beta',
    email: 'supplier.beta@auto-parts.local',
    role: 'SUPPLIER_USER',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Demo Support Manager',
    email: 'support.demo@auto-parts.local',
    role: 'SUPPORT_MANAGER',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    name: 'Demo Admin',
    email: 'admin.demo@auto-parts.local',
    role: 'ADMIN',
  },
] as const;

export const demoSuppliers = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Demo Parts Hub',
    slug: 'demo-parts-hub',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    name: 'Demo Motor Supply',
    slug: 'demo-motor-supply',
  },
] as const;

export const demoSupplierUsers = [
  {
    id: '21000000-0000-4000-8000-000000000001',
    userEmail: 'supplier.alpha@auto-parts.local',
    supplierSlug: 'demo-parts-hub',
  },
  {
    id: '21000000-0000-4000-8000-000000000002',
    userEmail: 'supplier.beta@auto-parts.local',
    supplierSlug: 'demo-motor-supply',
  },
] as const;

export const demoCategories = [
  { id: '30000000-0000-4000-8000-000000000001', name: 'Brakes' },
  { id: '30000000-0000-4000-8000-000000000002', name: 'Filters' },
] as const;

export const demoBrands = [
  { id: '31000000-0000-4000-8000-000000000001', name: 'Bosch' },
  { id: '31000000-0000-4000-8000-000000000002', name: 'MANN-FILTER' },
] as const;

export const demoProducts = [
  {
    id: '32000000-0000-4000-8000-000000000001',
    name: 'Front Brake Pad Set',
    description: 'Synthetic front axle brake pad set for demo scenarios.',
    categoryName: 'Brakes',
    brandName: 'Bosch',
  },
  {
    id: '32000000-0000-4000-8000-000000000002',
    name: 'Engine Oil Filter',
    description: 'Synthetic spin-on oil filter for demo scenarios.',
    categoryName: 'Filters',
    brandName: 'MANN-FILTER',
  },
  {
    id: '32000000-0000-4000-8000-000000000003',
    name: 'Engine Air Filter',
    description: 'Synthetic panel air filter for demo scenarios.',
    categoryName: 'Filters',
    brandName: 'Bosch',
  },
] as const;

export const demoProductVariants = [
  {
    id: '33000000-0000-4000-8000-000000000001',
    productId: '32000000-0000-4000-8000-000000000001',
    sku: 'DEMO-BOSCH-BP-001',
    manufacturerPartNumber: '0 986 494 001',
    oemNumber: 'DEMO-OEM-BP-001',
  },
  {
    id: '33000000-0000-4000-8000-000000000002',
    productId: '32000000-0000-4000-8000-000000000001',
    sku: 'DEMO-BOSCH-BP-002',
    manufacturerPartNumber: '0 986 494 002',
    oemNumber: 'DEMO-OEM-BP-002',
  },
  {
    id: '33000000-0000-4000-8000-000000000003',
    productId: '32000000-0000-4000-8000-000000000002',
    sku: 'DEMO-MANN-OF-003',
    manufacturerPartNumber: 'W 712/95',
    oemNumber: 'DEMO-OEM-OF-003',
  },
  {
    id: '33000000-0000-4000-8000-000000000004',
    productId: '32000000-0000-4000-8000-000000000003',
    sku: 'DEMO-BOSCH-AF-004',
    manufacturerPartNumber: 'F 026 400 004',
    oemNumber: 'DEMO-OEM-AF-004',
  },
] as const;

export const demoVehicleMakes = [
  { id: '40000000-0000-4000-8000-000000000001', name: 'Toyota' },
  { id: '40000000-0000-4000-8000-000000000002', name: 'Volkswagen' },
] as const;

export const demoVehicleModels = [
  {
    id: '41000000-0000-4000-8000-000000000001',
    makeName: 'Toyota',
    name: 'Corolla',
  },
  {
    id: '41000000-0000-4000-8000-000000000002',
    makeName: 'Volkswagen',
    name: 'Golf',
  },
] as const;

export const demoVehicleGenerations = [
  {
    id: '42000000-0000-4000-8000-000000000001',
    modelKey: 'Toyota:Corolla',
    code: 'E210',
    name: 'Corolla E210',
    yearFrom: 2018,
    yearTo: 2024,
  },
  {
    id: '42000000-0000-4000-8000-000000000002',
    modelKey: 'Volkswagen:Golf',
    code: 'MK7',
    name: 'Golf Mk7',
    yearFrom: 2012,
    yearTo: 2020,
  },
] as const;

export const demoEngineTypes = [
  {
    id: '43000000-0000-4000-8000-000000000001',
    generationKey: 'Toyota:Corolla:E210',
    code: '2ZR-FXE',
    name: '1.8 Hybrid',
  },
  {
    id: '43000000-0000-4000-8000-000000000002',
    generationKey: 'Toyota:Corolla:E210',
    code: 'M20A-FKS',
    name: '2.0 Petrol',
  },
  {
    id: '43000000-0000-4000-8000-000000000003',
    generationKey: 'Volkswagen:Golf:MK7',
    code: 'CZCA',
    name: '1.4 TSI',
  },
  {
    id: '43000000-0000-4000-8000-000000000004',
    generationKey: 'Volkswagen:Golf:MK7',
    code: 'CRBC',
    name: '2.0 TDI',
  },
] as const;

export const demoFitmentRules = [
  {
    id: '44000000-0000-4000-8000-000000000001',
    variantSku: 'DEMO-BOSCH-BP-001',
    generationKey: 'Toyota:Corolla:E210',
    engineKey: 'Toyota:Corolla:E210:2ZR-FXE',
  },
  {
    id: '44000000-0000-4000-8000-000000000002',
    variantSku: 'DEMO-BOSCH-BP-001',
    generationKey: 'Toyota:Corolla:E210',
    engineKey: 'Toyota:Corolla:E210:M20A-FKS',
  },
  {
    id: '44000000-0000-4000-8000-000000000003',
    variantSku: 'DEMO-BOSCH-BP-002',
    generationKey: 'Volkswagen:Golf:MK7',
    engineKey: 'Volkswagen:Golf:MK7:CZCA',
  },
  {
    id: '44000000-0000-4000-8000-000000000004',
    variantSku: 'DEMO-MANN-OF-003',
    generationKey: 'Toyota:Corolla:E210',
    engineKey: 'Toyota:Corolla:E210:2ZR-FXE',
  },
  {
    id: '44000000-0000-4000-8000-000000000005',
    variantSku: 'DEMO-MANN-OF-003',
    generationKey: 'Volkswagen:Golf:MK7',
    engineKey: 'Volkswagen:Golf:MK7:CRBC',
  },
] as const;

export const demoListings = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    supplierSlug: 'demo-parts-hub',
    variantSku: 'DEMO-BOSCH-BP-001',
    status: 'DRAFT',
    condition: 'NEW',
    price: 1499,
    stockQuantity: 15,
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    supplierSlug: 'demo-parts-hub',
    variantSku: 'DEMO-BOSCH-BP-002',
    status: 'PENDING_APPROVAL',
    condition: 'NEW',
    price: 1699,
    stockQuantity: 8,
  },
  {
    id: '50000000-0000-4000-8000-000000000003',
    supplierSlug: 'demo-parts-hub',
    variantSku: 'DEMO-MANN-OF-003',
    status: 'ACTIVE',
    condition: 'NEW',
    price: 459,
    stockQuantity: 30,
  },
  {
    id: '50000000-0000-4000-8000-000000000004',
    supplierSlug: 'demo-motor-supply',
    variantSku: 'DEMO-BOSCH-AF-004',
    status: 'PAUSED',
    condition: 'NEW',
    price: 799,
    stockQuantity: 12,
  },
  {
    id: '50000000-0000-4000-8000-000000000005',
    supplierSlug: 'demo-motor-supply',
    variantSku: 'DEMO-BOSCH-BP-001',
    status: 'REJECTED',
    condition: 'NEW',
    price: 1525,
    stockQuantity: 5,
  },
  {
    id: '50000000-0000-4000-8000-000000000006',
    supplierSlug: 'demo-motor-supply',
    variantSku: 'DEMO-MANN-OF-003',
    status: 'ARCHIVED',
    condition: 'NEW',
    price: 429,
    stockQuantity: 0,
  },
] as const;

export const demoOrders = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    customerEmail: 'customer.demo@auto-parts.local',
    status: 'PENDING_PAYMENT',
    totalAmount: 459,
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    customerEmail: 'customer.demo@auto-parts.local',
    status: 'DELIVERED',
    totalAmount: 1377,
  },
] as const;

export const demoOrderItems = [
  {
    id: '61000000-0000-4000-8000-000000000001',
    orderId: '60000000-0000-4000-8000-000000000001',
    listingId: '50000000-0000-4000-8000-000000000003',
    quantity: 1,
    unitPrice: 459,
  },
  {
    id: '61000000-0000-4000-8000-000000000002',
    orderId: '60000000-0000-4000-8000-000000000002',
    listingId: '50000000-0000-4000-8000-000000000003',
    quantity: 2,
    unitPrice: 459,
  },
  {
    id: '61000000-0000-4000-8000-000000000003',
    orderId: '60000000-0000-4000-8000-000000000002',
    listingId: '50000000-0000-4000-8000-000000000003',
    quantity: 1,
    unitPrice: 459,
  },
] as const;

export const demoPaymentEvents = [
  {
    id: '62000000-0000-4000-8000-000000000001',
    orderId: '60000000-0000-4000-8000-000000000002',
    externalEventId: 'demo-payment-processed-001',
    eventType: 'payment.succeeded',
    status: 'PROCESSED',
    scenario: 'delivered-order-payment',
    processedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: '62000000-0000-4000-8000-000000000002',
    orderId: '60000000-0000-4000-8000-000000000001',
    externalEventId: 'demo-payment-failed-001',
    eventType: 'payment.failed',
    status: 'FAILED',
    scenario: 'pending-order-payment',
    processedAt: '2026-01-15T10:05:00.000Z',
  },
] as const;

export const demoReturnRequests = [
  {
    id: '63000000-0000-4000-8000-000000000001',
    orderItemId: '61000000-0000-4000-8000-000000000002',
    status: 'REQUESTED',
    reason: 'Synthetic demo request: package was damaged.',
  },
  {
    id: '63000000-0000-4000-8000-000000000002',
    orderItemId: '61000000-0000-4000-8000-000000000003',
    status: 'COMPLETED',
    reason: 'Synthetic demo request: wrong item was delivered.',
  },
] as const;
