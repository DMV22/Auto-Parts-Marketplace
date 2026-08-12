# Execution plan: Supplier Cabinet API

## Summary

Реалізувати Milestone 9 як ізольований backend-кабінет постачальника поверх завершених domain/auth/RBAC, catalog і commerce foundations з Milestones 6-8. API має підтримувати supplier-owned керування Listing, явний publication workflow, concurrency-safe оновлення stock і privacy-safe read-only проєкцію власних OrderItem постачальника.

Milestone розбито на підетапи 9.1-9.5:

1. supplier-scoped Listing CRUD та ownership enforcement;
2. submit, approval, rejection, pause, resume й archival для Listing;
3. concurrency-safe stock management;
4. supplier-owned OrderItem queries;
5. clean-database і regression readiness gate.

## Goal

Після завершення плану активний SupplierUser зможе через стабільний `/api/v1/suppliers/:supplierId/*` boundary керувати лише Listings та inventory свого Supplier і читати лише ті OrderItems, які належать цьому Supplier. Public catalog продовжить показувати тільки `ACTIVE` Listings, а реалізація створить безпечний foundation для internal CRM/OMS у Milestone 10.

## Non-goals

- Frontend або Supplier Cabinet UI.
- Stripe Connect, payouts, supplier billing чи financial settlement.
- Shipping labels, carrier integrations, delivery tracking або fulfillment workflow.
- Multi-warehouse inventory, routing, backorders або replenishment.
- Returns, refunds, disputes, customer support, CRM чи OMS write operations.
- Bulk import/export, створення Product або адміністрування catalog taxonomy.
- Загальний moderation engine або append-only moderation audit trail.
- Зміна customer/guest ownership для Cart, Checkout, Payment або Order.

## Context inspected

- `docs/ROADMAP-MILESTONES.md` - high-level вимоги Milestone 9.
- `docs/BACKEND-PLAN.md` - domain, Auth/RBAC, SupplierUser membership та ownership foundations із Milestone 6.
- `docs/CATALOG-API-PLAN.md` - public Listing visibility і PDP contracts.
- `docs/COMMERCE-API-PLAN.md` - immutable OrderItem snapshots, stock reservation, payment lifecycle та commerce ownership boundaries.
- `apps/api/prisma/schema.prisma` - поточні моделі й enums Supplier, SupplierUser, Listing, ProductVariant, Order та OrderItem.
- `apps/api/src/auth/` - session, roles, supplier ownership decorator і guards.
- `apps/api/src/commerce/` - поточна atomic stock reservation/release поведінка та OrderItem projections.
- `apps/api/test/` - guarded `auto_parts_test` lifecycle і fixture conventions.

## Current behavior

Milestones 6-8 уже надають:

- Better Auth, який визначає authenticated User і persisted role;
- `SupplierUser` як active/inactive membership між User і Supplier; Guest не є persisted role;
- `SupplierOwnershipGuard`, який перевіряє route-level supplier ownership і має явний Admin bypass; SupportManager не отримує supplier write access;
- Listing, пов’язаний із Supplier та ProductVariant, зі статусами `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `PAUSED`, `REJECTED` і `ARCHIVED`;
- public Catalog/PDP та commerce availability, які використовують лише `ACTIVE` Listings;
- transactional stock reservation під час Checkout і одноразове повернення stock для failed/expired payment paths;
- immutable commercial snapshots в OrderItem і relation до Listing, через який можна визначити supplier ownership;
- guarded `auto_parts_test`, committed migrations та незалежні test fixtures.

Поточні gaps для Milestone 9:

- немає Supplier Cabinet API для Listing, inventory, approval або OrderItem;
- немає runtime policy для переходів Listing між supplier і Admin states;
- немає optimistic concurrency contract для supplier stock updates;
- немає supplier-safe OrderItem DTO, який приховує повний Order і дані інших Suppliers.

## Desired behavior

- Активний SupplierUser може list/create/read/update лише Listings свого Supplier.
- Listing створюється тільки для існуючого ProductVariant і починається зі статусу `DRAFT`.
- Supplier та Admin actions дотримуються явної transition matrix; invalid або stale transitions завершуються передбачуваною помилкою.
- Лише Admin може approve або reject pending Listing. SupportManager не отримує implicit supplier чи moderation write access.
- Public Catalog/PDP і Cart продовжують бачити лише `ACTIVE` Listings.
- Кожна stock mutation є atomic, не допускає negative stock і виявляє stale concurrent writes.
- SupplierUser читає тільки OrderItems свого Supplier через обмежений DTO без повного Order, customer/guest identity, payment payloads або позицій інших Suppliers.
- Collection endpoints використовують validated filters, bounded pagination та deterministic sorting.
- Missing і foreign-owned resources повертають однаковий non-disclosing response.

## Constraints

- Реалізація належить лише backend `apps/api`; frontend і Milestone 10 не змінювати.
- Використовувати поточні Node.js `>=22.12.0 <23`, NestJS 11, Prisma `7.9.0`, PostgreSQL 16 і pnpm.
- Prisma Client залишається лише в `apps/api` і доступний через існуючий `PrismaModule`/`PrismaService`; не створювати новий `PrismaClient`.
- Product API використовує `/api/v1`; Better Auth boundary `/api/auth/*` не змінювати.
- Supplier identity завжди визначається з authenticated server-side context і active membership. Request body не може вибрати чи перевизначити ownership.
- Supplier routes мають `supplierId` у path, перевіряються централізованим guard і повторно обмежуються supplier predicate у persistence query як defense in depth.
- Admin bypass має бути явним у кожному підтриманому policy boundary. SupportManager не успадковує supplier write access.
- SupplierUser може працювати лише з membership у статусі `ACTIVE`.
- Listing має посилатися на існуючий ProductVariant; Supplier Cabinet не створює Product або vehicle taxonomy.
- Видалення Listing представляється статусом `ARCHIVED`; hard delete Listing або commerce records не використовується.
- `stockQuantity` ніколи не може бути від’ємним. Потрібні PostgreSQL constraint та atomic conditional updates, а не лише DTO validation.
- Historical migrations immutable. Schema changes виконуються тільки reviewed forward migrations із зафіксованою rollback posture.
- Integration/e2e tests використовують guarded `TEST_DATABASE_URL`/`auto_parts_test`, власні fixtures і не залежать від demo seed.
- Supplier OrderItem API у Milestone 9 є read-only.
- Customer/guest ownership, immutable OrderItem snapshots, PaymentEvent payloads і checkout/payment transitions не можна послаблювати або розкривати.

## Open questions

Design questions для Milestone 9 закриті перед реалізацією:

1. **Listing workflow та approval authority - resolved.** SupplierUser створює `DRAFT`, редагує власні `DRAFT`/`REJECTED`, submit-ить їх у `PENDING_APPROVAL`, переводить `ACTIVE -> PAUSED`, `PAUSED -> ACTIVE` і archive-ить власний Listing. Лише Admin переводить `PENDING_APPROVAL -> ACTIVE | REJECTED`. SupportManager не має write authority.
2. **Зміни після approval - resolved.** Зміна ProductVariant, condition або currency скасовує approval і переводить Listing у `PENDING_APPROVAL`; price та stock не потребують повторного approval. Public visibility залишається обмеженою статусом `ACTIVE`.
3. **Concurrent stock writes - resolved.** Використовувати absolute quantity та `expectedVersion` для `inventoryVersion`. Supplier update, checkout reservation і compensation release атомарно збільшують version. Stale version повертає `409 Conflict`.
4. **Supplier OrderItem projection - resolved.** API є read-only і визначає ownership через `OrderItem -> Listing -> supplierId`. Response виключає повний Order, customer/guest identifiers, payment data, Stripe metadata та OrderItems інших Suppliers.
5. **Rejection metadata - resolved.** Listing зберігає мінімальний `rejectionReason`: він обов’язковий під час reject, видимий відповідному Supplier та Admin і очищується при resubmit. Повна moderation history належить Milestone 10.
6. **Ownership errors - resolved.** Foreign-owned і missing resources повертають однаковий `404`; unauthenticated і role/membership failures зберігають стандартні `401`/`403` до resource lookup.

## Proposed approach

Реалізацію виконувати вертикальними Nest boundaries із thin controllers, whitelist DTO validation, централізованими ownership/transition policies, Prisma transactions та explicit response projections:

```text
Better Auth session
  -> SessionAuthGuard / RolesGuard
  -> SupplierOwnershipGuard
  -> Supplier Cabinet controller
  -> validated command/query
  -> Listing / Inventory / SupplierOrderItems service
  -> injected PrismaService
  -> PostgreSQL 16

Admin moderation request
  -> SessionAuthGuard / RolesGuard
  -> explicit Admin boundary
  -> Listing transition policy
  -> conditional Prisma update
```

Recommended module split:

- `SupplierCabinetModule` - composition boundary; не створює parallel Prisma client.
- Listing controller/service - supplier-owned Listing CRUD, pagination і response mapping.
- Listing transition service/policy - submit, approve, reject, pause, resume й archive rules.
- Inventory service - optimistic concurrency та non-negative stock updates.
- Supplier OrderItems controller/service - privacy-safe read-only projection.

Recommended API baseline:

- `GET /api/v1/suppliers/:supplierId/listings`
- `POST /api/v1/suppliers/:supplierId/listings`
- `GET /api/v1/suppliers/:supplierId/listings/:listingId`
- `PATCH /api/v1/suppliers/:supplierId/listings/:listingId`
- `POST /api/v1/suppliers/:supplierId/listings/:listingId/submit`
- `POST /api/v1/suppliers/:supplierId/listings/:listingId/pause`
- `POST /api/v1/suppliers/:supplierId/listings/:listingId/resume`
- `POST /api/v1/suppliers/:supplierId/listings/:listingId/archive`
- `PUT /api/v1/suppliers/:supplierId/listings/:listingId/stock`
- `GET /api/v1/suppliers/:supplierId/order-items`
- `GET /api/v1/suppliers/:supplierId/order-items/:orderItemId`
- `POST /api/v1/admin/listings/:listingId/approve`
- `POST /api/v1/admin/listings/:listingId/reject`

Common Supplier Cabinet rules:

- Поєднувати `SessionAuthGuard`, `RolesGuard`, `@SupplierOwned()` та існуючий `SupplierOwnershipGuard` для supplier-scoped routes.
- Повторювати `supplierId` у Prisma `where` для кожного single-resource read або mutation. Guard забезпечує authorization, а scoped query захищає від випадкового cross-tenant доступу при повторному використанні service.
- Не довіряти client-supplied `supplierId`, `userId`, status, ownership fields або stock version.
- Зберігати allowed transitions в одному policy/service і виконувати conditional update з перевіркою expected current status.
- Supplier transitions: `DRAFT | REJECTED -> PENDING_APPROVAL`, `ACTIVE -> PAUSED`, `PAUSED -> ACTIVE`, а non-archived owned states можуть перейти в `ARCHIVED` із дотриманням commerce invariants.
- Admin transitions: `PENDING_APPROVAL -> ACTIVE` та `PENDING_APPROVAL -> REJECTED` з обов’язковою причиною.
- Material edit ProductVariant/condition/currency повертає approved/paused Listing у `PENDING_APPROVAL`; price та stock зберігають publication status.
- `rejectionReason` очищується на resubmit/approval і ніколи не потрапляє в public Catalog/PDP DTO.
- Inventory write приймає `{ quantity, expectedVersion }`, conditionally update-ить Listing за id, supplier і version та increment-ить `inventoryVersion`.
- Zero-row conditional inventory update мапиться в `409`; client повинен refetch quantity/version перед retry.
- Collection endpoints використовують bounded cursor pagination, allowlisted filters і stable unique tie-breaker.
- Supplier OrderItem DTO показує лише supplier-relevant immutable snapshots, quantity, unit price, currency, public Order status і timestamps.

Testing strategy:

- Unit tests для DTO validation, transition policy, role/ownership decisions, stock conflict mapping і response projections.
- Integration tests для Prisma scoping, Listing transitions, DB non-negative constraint, optimistic concurrency, checkout/reservation version increments та OrderItem isolation.
- E2E tests для SupplierUser/Admin routes, inactive membership, foreign ownership, SupportManager denial, non-disclosing `404`, public catalog exclusion та pagination bounds.
- Fixtures створюються безпосередньо в guarded `auto_parts_test`; demo seed і live Stripe network не використовуються.

---

## Milestone 9.1 - Supplier-scoped Listing API

### Goal

Додати Supplier Cabinet boundary та owner-isolated Listing CRUD без зміни publication або inventory semantics поза наявними safe defaults.

### Tasks

- [ ] Додати `SupplierCabinetModule` і focused Listing controller/service/DTO files у `apps/api/src/supplier-cabinet/`, зареєструвати module в AppModule.
- [ ] Захистити supplier routes через session, SupplierUser role, active membership і централізовану supplier ownership policy; зберегти лише explicit Admin bypass.
- [ ] Реалізувати owner-scoped list/detail/create/update для Listing.
- [ ] Перевіряти, що `productVariantId` посилається на існуючий ProductVariant перед create або дозволеним edit.
- [ ] Створювати Listing зі статусом `DRAFT`; ігнорувати або відхиляти client-supplied status, supplierId, timestamps та інші server-owned fields.
- [ ] Додати allowlisted filters, bounded cursor pagination і deterministic sorting для Listing collections.
- [ ] Повертати однаковий `404` для missing і foreign-owned Listing id.
- [ ] Додати unit, integration та e2e tests для ownership, inactive membership, foreign Supplier, SupportManager denial, Admin bypass, invalid ProductVariant, DTO validation і pagination bounds.

### Definition of Done

- [ ] Active SupplierUser може створювати та читати лише Listings свого Supplier.
- [ ] Кожен новий Listing пов’язаний із валідним ProductVariant і починається як `DRAFT`.
- [ ] Foreign-owned і missing Listings неможливо відрізнити за response.
- [ ] SupportManager не може змінювати supplier data; Admin access перевірений явно.
- [ ] Collection pagination bounded і deterministic.
- [ ] Tests використовують ізольовані fixtures у guarded `auto_parts_test`.

### Validation

```bash
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
git diff --check
```

---

## Milestone 9.2 - Listing approval and publication lifecycle

### Goal

Реалізувати погоджений supplier submission та Admin review workflow, зберігши всі non-public states поза public Catalog/PDP responses.

### Tasks

- [ ] Додати одну explicit Listing transition policy для supplier та Admin actions.
- [ ] Реалізувати supplier submit, pause, resume й archive commands з ownership та expected-state checks.
- [ ] Реалізувати Admin-only approve/reject commands; вимагати non-empty bounded `rejectionReason` для reject.
- [ ] Додати `rejectionReason` через reviewed forward migration; очищувати його на resubmit/approval і виключити з public projections.
- [ ] Зробити так, щоб edit ProductVariant, condition або currency скасовував approval і повертав approved/paused Listing у `PENDING_APPROVAL`; price edit не змінює publication status.
- [ ] Використовувати conditional mutations, щоб concurrent або stale transitions повертали consistent conflict без silent overwrite.
- [ ] Regression-test Catalog/PDP і Cart visibility: `DRAFT`, `PENDING_APPROVAL`, `PAUSED`, `REJECTED` і `ARCHIVED` не можуть стати public/purchasable.
- [ ] Перевірити всі allowed/forbidden transitions, Supplier/Admin authority, reason lifecycle і SupportManager denial.

### Definition of Done

- [ ] Listing transitions відповідають погодженій state/actor matrix.
- [ ] Лише Admin може approve або reject pending Listing.
- [ ] Reject вимагає reason; resubmit очищує його.
- [ ] Approval-sensitive edits повертають Listing у `PENDING_APPROVAL`.
- [ ] Лише `ACTIVE` Listings потрапляють у Catalog/PDP і проходять Cart availability.
- [ ] Stale або invalid transitions завершуються без partial updates.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
git diff --check
```

---

## Milestone 9.3 - Concurrency-safe inventory API

### Goal

Дозволити Supplier встановлювати absolute stock quantity без lost updates або negative inventory, зокрема коли Supplier Cabinet і Checkout конкурентно змінюють один Listing.

### Tasks

- [ ] Додати `inventoryVersion Int @default(0)` і database-level non-negative stock constraint через нову forward migration; переглянути generated SQL перед commit.
- [ ] Реалізувати owner-scoped stock command, який приймає лише `quantity` та `expectedVersion`.
- [ ] Atomic update має перевіряти Listing id, Supplier id і current version, increment-ити version при успіху та повертати нові quantity/version.
- [ ] Повертати `409 Conflict` для stale version і вимагати refetch перед retry.
- [ ] Оновити checkout reservation і one-time compensation paths, щоб вони increment-или `inventoryVersion` у тій самій transaction, що й stock.
- [ ] Зберегти правило, що stock визначається server-side і не може стати від’ємним під concurrent requests.
- [ ] Додати integration tests для двох supplier writers, supplier-versus-checkout race, insufficient stock, compensation release, stale version і DB constraint.

### Definition of Done

- [ ] Supplier stock update вимагає ownership і current `expectedVersion`.
- [ ] Два конкурентні writes не можуть silently overwrite один одного.
- [ ] `stockQuantity` не може стати від’ємним через API або direct Prisma write.
- [ ] Checkout reservation/release increment-ить ту саму inventory version.
- [ ] Stale writer отримує `409`, а stock не змінюється.
- [ ] Existing Cart/Checkout payment і compensation tests залишаються green.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
git diff --check
```

---

## Milestone 9.4 - Supplier-owned OrderItem API

### Goal

Надати read-only supplier projection проданих позицій без розкриття повного Order, customer/guest identity, payment internals або даних іншого Supplier.

### Tasks

- [ ] Реалізувати owner-scoped OrderItem list/detail endpoints у Supplier Cabinet boundary.
- [ ] Визначати ownership через `OrderItem -> Listing -> supplierId` у кожному Prisma query; не авторизувати за client-supplied ownership data.
- [ ] Визначити explicit DTO лише із supplier-relevant immutable item snapshots, quantity, unit price, currency, public Order status і timestamps.
- [ ] Виключити full Order, customer/guest identifiers, addresses, PaymentEvent payloads, Stripe metadata/secrets, guest hashes і OrderItems інших Suppliers.
- [ ] Додати allowlisted Order status/date filters, bounded cursor pagination і stable `Order.createdAt DESC, OrderItem.id DESC` sorting.
- [ ] Зберегти non-disclosing `404` для missing і foreign-owned detail.
- [ ] Додати integration/e2e fixture з одним multi-supplier Order, щоб довести ізоляцію; перевірити inactive membership, SupportManager denial та explicit Admin bypass.

### Definition of Done

- [ ] SupplierUser бачить лише OrderItems, Listing яких належить його Supplier.
- [ ] Multi-supplier Order не розкриває items іншого Supplier або full Order.
- [ ] Customer/guest identity, addresses і payment/webhook internals відсутні в response.
- [ ] Endpoints є read-only і не змінюють Order/payment/fulfillment state.
- [ ] Pagination, sorting, filters і ownership errors відповідають shared API contract.
- [ ] Negative isolation tests працюють із fixtures у guarded `auto_parts_test`.

### Validation

```bash
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
git diff --check
```

---

## Milestone 9.5 - Supplier Cabinet readiness gate

### Goal

Довести, що Milestones 9.1-9.4 утворюють reproducible й owner-isolated Supplier Cabinet foundation, та зафіксувати contracts для Milestone 10.

### Tasks

- [ ] Провести clean guarded database rehearsal: застосувати всі committed migrations, згенерувати Prisma Client і запустити Supplier Cabinet integration/e2e suites з owned fixtures.
- [ ] Запустити повний auth, catalog, commerce і Supplier Cabinet regression.
- [ ] Переконатися, що жоден endpoint не обходить centralized session/RBAC/supplier ownership policy та не створює PrismaClient поза PrismaService.
- [ ] Переглянути Listing і OrderItem queries через representative `EXPLAIN`; додавати index лише forward migration та лише за measured query-plan evidence.
- [ ] Перевірити bounded pagination, allowlisted filters, deterministic sorting і explicit DTO projection у всіх collection endpoints.
- [ ] Переконатися, що public Catalog/PDP/Cart приймають лише `ACTIVE` Listings, а commerce stock reservation залишається concurrency-safe.
- [ ] Оновити relevant API documentation: supplier routes, role/ownership rules, Listing lifecycle, inventory conflict semantics та OrderItem privacy boundary.
- [ ] Зафіксувати Milestone 10 handoff: Admin approval boundary, minimal rejection metadata, supplier-owned OrderItems і відкладені moderation audit, returns, CRM/OMS, shipping та payouts.

### Definition of Done

- [ ] Clean migrated `auto_parts_test` проходить усі relevant suites без demo seed.
- [ ] Supplier, Admin, SupportManager, inactive membership і foreign ownership поведінка покрита negative tests.
- [ ] Concurrent stock tests доводять відсутність lost updates і negative inventory.
- [ ] Public Catalog/PDP/Cart і Milestone 8 regressions залишаються green.
- [ ] Query plans і pagination bounds перевірені для Listing та OrderItem collections.
- [ ] Documentation і Milestone 10 handoff відповідають фактичній реалізації.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm lint
pnpm check-types
pnpm build
git diff --check
```

## Migration and rollback strategy

- Не редагувати й не squash-ити committed historical migrations.
- Генерувати forward migrations стандартним локальним Prisma workflow, після чого переглядати SQL перед commit.
- Backfill `inventoryVersion` значенням `0` через non-null default, щоб existing Listings залишилися валідними.
- Додати `rejectionReason` як nullable; runtime rules, а не destructive backfill, вимагають його для майбутніх rejection actions.
- Додавати non-negative stock constraint лише після explicit preflight query, яка підтверджує відсутність existing negative rows. У разі невідповідності abort, а не silent data rewrite.
- Deploy additive schema changes має передувати коду, який їх потребує. Для rollback спочатку повернути application code, а additive columns/constraints залишити; видаляти їх лише окремою reviewed forward migration.
- Якщо query-plan evidence вимагає index, додати його окремою descriptive forward migration для незалежного review operational impact і rollback.

## Risks and mitigations

- **Cross-supplier data leak:** centralized guard, supplier-scoped Prisma predicates, explicit DTO projections, multi-supplier negative fixtures і non-disclosing lookups.
- **Privilege expansion через roles:** explicit Admin bypass tests і explicit SupportManager denial; controllers не визначають role policy самостійно.
- **Lost stock updates:** optimistic version matching, atomic increments і `409` conflict semantics для Supplier Cabinet та Checkout.
- **Negative stock під час race:** PostgreSQL check constraint, conditional transactional mutations і concurrency tests.
- **Публікація непогодженого Listing:** єдиний `ACTIVE` predicate contract для public Catalog/PDP/Cart і regression tests.
- **Stale approval після material edit:** central edit policy повертає Listing у `PENDING_APPROVAL` та очищує stale rejection metadata.
- **Commerce/privacy leakage:** supplier-specific OrderItem select виключає full Order, identities, addresses, PaymentEvent payloads, Stripe fields і foreign items.
- **Unbounded або unstable queries:** bounded cursor pagination, allowlisted filters, unique tie-breakers і query-plan review перед readiness sign-off.
- **Flaky tests або environment contamination:** guarded `auto_parts_test`, suite-owned fixtures, deterministic cleanup, відсутність demo seed і live Stripe network.
