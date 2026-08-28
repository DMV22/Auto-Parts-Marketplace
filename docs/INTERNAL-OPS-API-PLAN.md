# Execution plan: Internal CRM/OMS, Returns та Moderation

## Summary

Реалізувати Milestone 10 як внутрішній operational API поверх завершених domain/auth, catalog, commerce та Supplier Cabinet foundations із Milestones 6-9. API має надати `SupportManager` контрольовану роботу із замовленнями та поверненнями, а `Admin` — окрему moderation boundary для Listings і глобальний audit view.

Milestone розбито на підетапи 10.1-10.5:

1. persistence і transition-policy baseline;
2. внутрішня OMS-черга замовлень;
3. customer/support Returns API;
4. internal Notes та append-only ActivityLog;
5. Admin moderation і readiness gate.

## Goal

Після завершення плану Customer зможе створити та читати повернення лише для власного доставленого `OrderItem`, `SupportManager` — обробляти дозволені Order/Return workflows та internal notes, а `Admin` — модерувати Listings і читати глобальний audit trail. Усі критичні переходи мають бути централізованими, атомарними, авторизованими та зафіксованими в `ActivityLog` без витоку internal, payment або customer-sensitive даних у customer/supplier API.

## Non-goals

- Frontend, CRM/OMS dashboard або moderation UI.
- Shipping/carrier integrations, delivery tracking automation або fulfillment platform.
- Refunds, disputes, chargebacks, payouts або Stripe Connect.
- Warehouse routing, multi-warehouse inventory або replenishment.
- Автоматичні SLA, notification platform, email/SMS workflows або background-job framework.
- Supplier write-access до Order, OrderItem, ReturnRequest, Note чи ActivityLog.
- Зміна Stripe webhook authority або customer/guest commerce ownership.
- Повноцінний content-moderation engine, rules engine або moderation history поза погодженим `ActivityLog`.
- Hard delete operational history чи historical migrations.

## Context inspected

- `docs/ROADMAP-MILESTONES.md` — high-level Goal, Tasks і Definition of Done для Milestone 10.
- `docs/BACKEND-PLAN.md` — persisted roles, session/RBAC boundary та початковий status baseline.
- `docs/COMMERCE-API-PLAN.md` — Order ownership, immutable OrderItem snapshots, Stripe authority та public timeline contract.
- `docs/SUPPLIER-CABINET-API-PLAN.md` — Listing lifecycle, Admin moderation boundary та supplier-safe projections.
- `docs/CONTEXT.md` і `docs/ARCHITECTURE.md` — актуальні system/persistence boundaries.
- `apps/api/prisma/schema.prisma` — поточні `Order`, `OrderItem`, `OrderStatusEvent`, `PaymentEvent`, `ReturnRequest`, `Listing`, `Supplier` та auth relations.
- `apps/api/src/auth/` — `SessionAuthGuard`, `RolesGuard`, decorators і централізовані ownership policies.
- `apps/api/src/commerce/` — customer/guest Order reads, payment transitions і timeline projection.
- `apps/api/src/supplier-cabinet/` — Listing moderation та supplier ownership patterns.
- `apps/api/test/` — guarded `auto_parts_test`, suite-owned fixtures і integration/e2e conventions.

## Current behavior

Milestones 6-9 уже надають:

- session-based Better Auth і persisted roles `CUSTOMER`, `SUPPLIER_USER`, `SUPPORT_MANAGER`, `ADMIN`;
- один application-wide `PrismaService` і guarded test database;
- owner-only customer/guest Order history, detail і public reason-coded timeline;
- webhook-only payment authority, immutable `PaymentEvent` identity та transactional Order transitions;
- `OrderStatus`: `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`;
- базовий `ReturnRequest`, пов'язаний з одним `OrderItem`, але без runtime API та `UNDER_REVIEW`;
- Admin-only approve/reject boundary для pending Listings і supplier-visible rejection metadata;
- Supplier-safe OrderItem API, який не розкриває повний Order, customer identity, addresses або payment payloads.

Наразі відсутні internal OMS queue, Return workflow, internal Note, ActivityLog, global moderation queue та runtime policy для SupportManager.

## Desired behavior

- `SupportManager` читає bounded global Order queue/detail і виконує лише дозволені post-payment переходи.
- Customer створює ReturnRequest лише для власного `DELIVERED` OrderItem; SupportManager може створити його від імені звернення клієнта, включно з guest Order.
- Return transitions проходять через одну policy/service boundary і не виконуються прямим Prisma update з controller.
- Internal `Note` належить рівно одному Order або ReturnRequest, не редагується звичайним API та ніколи не потрапляє в customer/supplier responses.
- Admin має глобальну moderation queue, approve/reject pending Listing та emergency pause active Listing без редагування supplier-owned content.
- Критичні Order, Return, moderation та Note/redaction дії створюють append-only `ActivityLog` у тій самій транзакції, що й state change.
- Усі collection endpoints використовують allowlisted filters, bounded cursor pagination, deterministic sorting і non-disclosing errors.

## Constraints

- Backend залишається на NestJS 11, Prisma 7.9.0, PostgreSQL 16 і pnpm.
- Використовувати лише наявний `PrismaModule`/`PrismaService`; заборонено створювати `new PrismaClient()` у modules/services/controllers.
- Historical migrations не редагуються. Schema changes реалізуються лише новими reviewed forward migrations.
- `SupportManager` отримує тільки явно перелічені OMS/Returns/Notes permissions; роль не надає supplier ownership або moderation access.
- `Admin` bypass має бути явним у кожній central policy та покритим тестами; він не обходить Stripe webhook authority.
- `SupplierUser` не отримує доступу до customer identity, address, PaymentEvent payload, internal Note, ActivityLog або повного Order.
- Customer/guest Order ownership залишається server-side. Guest self-service Return API не входить у scope.
- Return можна створити лише для `DELIVERED` OrderItem. Для одного OrderItem дозволений лише один незавершений ReturnRequest.
- `Note` є internal-only і append-only. Виправлення створюється новою Note; redaction — окрема Admin-only audited дія.
- State transition і відповідний ActivityLog мають commit/rollback разом в одній DB-транзакції.
- ActivityLog не зберігає повний Note text, Stripe payload, credentials, address чи необов'язкові персональні дані.
- Test suites використовують лише guarded `TEST_DATABASE_URL`/`auto_parts_test`, власні fixtures та не залежать від demo seed чи live Stripe/network.
- API routes використовують `/api/v1`; Better Auth boundary `/api/auth/*` не змінюється.

## Open questions

Питання закриті під час одноразової grilling-сесії та є контрактом цього плану.

1. **Хто може створити ReturnRequest?** Customer — лише для власного delivered OrderItem. SupportManager — від імені customer contact з обов'язковим ActivityLog; це також єдиний шлях для guest Order. SupplierUser не має доступу.
2. **Який Return lifecycle?** `REQUESTED -> UNDER_REVIEW -> APPROVED | REJECTED`, далі `APPROVED -> RECEIVED -> COMPLETED`; Customer може виконати `REQUESTED | UNDER_REVIEW | APPROVED -> CANCELLED`. `REJECTED`, `COMPLETED`, `CANCELLED` terminal.
3. **Що може змінювати SupportManager в Order?** Лише `PAID -> PROCESSING -> SHIPPED -> DELIVERED`. Він не може встановити `PAID`, cancel Order, змінити owner, items, prices або payment data. Admin має той самий operational bypass, але також не встановлює `PAID`.
4. **Чи редагується Note?** Ні. Note append-only; correction створюється новим записом з опціональним посиланням на виправлену Note. Hard delete відсутній; Admin redaction є винятковою audited операцією.
5. **Яка moderation policy?** Лише Admin бачить global queue і виконує `PENDING_APPROVAL -> ACTIVE | REJECTED` або emergency `ACTIVE -> PAUSED`; reject/pause reason обов'язковий і supplier-visible. Admin не редагує supplier-owned content.
6. **Що зберігає ActivityLog?** Actor/role snapshot, resource, action, previous/new status, allowlisted metadata/reason і timestamp. SupportManager бачить audit пов'язаного Order/Return; Admin — global read-only audit; Customer/SupplierUser доступу не мають.

## Proposed approach

### API boundaries

- `InternalOpsModule` — внутрішня boundary для OMS Orders, Returns, Notes та scoped audit reads.
- `ReturnsModule` або ізольований returns submodule — customer create/read і SupportManager processing поверх однієї `ReturnTransitionPolicy`.
- `ModerationModule` або admin submodule усередині internal ops — global Listing queue й Admin-only actions поверх наявної Listing transition policy.
- Controllers відповідають лише за route/DTO/guard composition; ownership, transitions, transaction та projections залишаються в services/policies.

### Route baseline

```text
GET  /api/v1/internal/orders
GET  /api/v1/internal/orders/:orderId
POST /api/v1/internal/orders/:orderId/transitions

POST /api/v1/orders/:orderId/items/:orderItemId/returns
GET  /api/v1/orders/:orderId/items/:orderItemId/returns

GET  /api/v1/internal/returns
GET  /api/v1/internal/returns/:returnRequestId
POST /api/v1/internal/returns/:returnRequestId/transitions

GET  /api/v1/internal/orders/:orderId/notes
POST /api/v1/internal/orders/:orderId/notes
GET  /api/v1/internal/returns/:returnRequestId/notes
POST /api/v1/internal/returns/:returnRequestId/notes
POST /api/v1/internal/notes/:noteId/redact

GET  /api/v1/internal/activity
GET  /api/v1/admin/moderation/listings
POST /api/v1/admin/moderation/listings/:listingId/approve
POST /api/v1/admin/moderation/listings/:listingId/reject
POST /api/v1/admin/moderation/listings/:listingId/pause
```

Назви transition endpoints можуть бути уточнені під час реалізації, але role, ownership і state-machine contracts змінюватися не повинні.

### Persistence baseline

- Додати `UNDER_REVIEW` до `ReturnRequestStatus` новою forward migration.
- Додати actor/decision fields і потрібні indexes до `ReturnRequest`, не дублюючи Order ownership.
- Забезпечити на рівні PostgreSQL один unfinished ReturnRequest на `OrderItem` через reviewed partial unique index.
- Додати `INTERNAL_OPS` як явне джерело `OrderStatusEvent`, не змінюючи Stripe/Checkout sources.
- Додати `Note` з рівно одним target (`orderId` XOR `returnRequestId`), author, correction relation та redaction metadata; XOR гарантувати check constraint.
- Додати append-only `ActivityLog` з actor snapshot, resource type/id, action, allowlisted JSON metadata і indexes для scoped chronological reads.
- Для Admin emergency pause додати окреме supplier-visible moderation reason field лише якщо наявний Listing contract не може без двозначності виразити pause reason; не перевантажувати `rejectionReason`.

### Transition and authorization policies

- `OrderTransitionPolicy` є єдиним місцем для Support/Admin post-payment transitions.
- `ReturnTransitionPolicy` є єдиним місцем для role/state matrix і terminal-state protection.
- Customer ownership перевіряється через `OrderItem -> Order -> customerId`; foreign/missing resources повертають однакову non-disclosing відповідь.
- Internal queue/detail використовують explicit DTO projections; PaymentEvent payload і Stripe metadata не включаються.
- ActivityLog записується application service в тій самій Prisma transaction, а не асинхронним best-effort listener.

### Pagination and validation

- Усі `limit` мають server-side default і жорсткий maximum.
- Cursor є opaque і містить sort field plus unique `id` tie-breaker.
- Default order: `createdAt DESC, id DESC`; інші sort/filter fields — тільки з allowlist.
- Enum, UUID, date range, cursor і transition payload проходять DTO/whitelist validation до service.

---

## Milestone 10.1 - Persistence and policy baseline

### Goal

Підготувати мінімальну data model і централізовані transition contracts для OMS, Returns, Notes, moderation та audit без додавання зайвої operational поведінки.

### Tasks

- [x] Оновити `schema.prisma`: `UNDER_REVIEW`, `INTERNAL_OPS`, Return actor/decision metadata, `Note`, `ActivityLog` і необхідні relations/indexes.
- [x] Створити одну або кілька логічно розділених forward migrations; не редагувати historical migrations.
- [x] Додати PostgreSQL constraints для Note target XOR і одного unfinished ReturnRequest на OrderItem.
- [x] Зафіксувати `OrderTransitionPolicy`, `ReturnTransitionPolicy` та moderation matrix як testable application policies.
- [x] Додати unit tests для allowed/forbidden/terminal transitions і role matrix.
- [x] Додати schema/migration integration tests, які виявляють enum/constraint/index drift.

### Definition of Done

- [x] Чиста `auto_parts_test` відтворюється committed migrations без schema drift.
- [x] `UNDER_REVIEW` і `INTERNAL_OPS` доступні Prisma Client.
- [x] База відхиляє другу unfinished ReturnRequest для того самого OrderItem.
- [x] Note не може одночасно належати Order і ReturnRequest або не мати target.
- [x] Transition policies не дозволяють controller/service обійти погоджені state/role rules.
- [x] Historical migration files не змінені.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api test -- --runInBand internal-ops
pnpm --filter api test:int internal-ops-schema.int-spec.ts
pnpm --filter api build
```

### Implementation log

**What changed**

- Додано `UNDER_REVIEW`, `INTERNAL_OPS`, actor/decision metadata, `Note`, `ActivityLog` і supplier-visible `moderationReason`.
- Додано forward migration `20260813141720_add_internal_ops_persistence_baseline` з data preflight, Note XOR check і partial unique index для unfinished ReturnRequest.
- Додано централізовані Order/Return policies та розширено наявну Listing moderation policy без endpoints або runtime workflows з 10.2-10.5.
- Додано unit transition matrix tests і `internal-ops-schema.int-spec.ts` для behavioral PostgreSQL constraints та schema drift regression.

**Why**

- Persistence і policy contracts Milestone 10 тепер зафіксовані до реалізації internal OMS/Returns/Notes APIs.
- Payment authority не змінена: internal Order policy не дозволяє встановити `PAID`.
- Note/Return invariants захищені базою навіть за конкурентних записів.

**Validation results**

- `prisma:validate`, `prisma:generate`, `prisma:migrate:deploy` для dev/test — пройдено; 12 committed migrations, pending migrations відсутні.
- Focused policy suites — 3 suites, 26 tests пройдено.
- `commerce-status-schema.int-spec.ts` — 6 tests пройдено.
- `internal-ops-schema.int-spec.ts` — 5 tests пройдено.
- `pnpm --filter api build` — пройдено.
- Prisma migrate diff — `No difference detected`; historical migration audit і `git diff --check` — пройдено.

---

## Milestone 10.2 - Internal OMS Order API

### Goal

Надати SupportManager/Admin безпечну global Order queue, privacy-safe detail/timeline та контрольовані post-payment transitions, не змінюючи webhook payment authority.

### Tasks

- [x] Додати `InternalOpsModule` і guarded `/api/v1/internal/orders` routes.
- [x] Реалізувати bounded queue з allowlisted filters за Order status, derived payment outcome і date range.
- [x] Реалізувати internal Order detail з items, public timeline і мінімально необхідним customer contact projection.
- [x] Реалізувати `PAID -> PROCESSING -> SHIPPED -> DELIVERED` через `OrderTransitionPolicy`.
- [x] Записувати `OrderStatusEvent(source=INTERNAL_OPS)` і `ActivityLog` атомарно з Order update.
- [x] Додати negative RBAC/privacy tests для Customer, SupplierUser і SupportManager forbidden mutations.

### Definition of Done

- [x] SupportManager/Admin бачать bounded deterministic Order queue/detail; інші ролі отримують non-disclosing denial.
- [x] SupportManager/Admin не можуть встановити `PAID`, cancel Order або змінити items, price, owner чи payment data.
- [x] Invalid, skipped, repeated і terminal transitions відхиляються без часткового запису.
- [x] Кожен успішний OMS transition створює рівно один OrderStatusEvent і ActivityLog у тій самій транзакції.
- [x] Internal DTO не містить PaymentEvent payload, Stripe secrets/metadata, guest hash або supplier-internal records.
- [x] Pagination bounded, filters allowlisted, sorting deterministic.

### Validation

```bash
pnpm --filter api test -- --runInBand internal-ops
pnpm --filter api test:int internal-orders.int-spec.ts
pnpm --filter api test:e2e internal-orders.e2e-spec.ts
pnpm --filter api build
```

### Implementation log

**What changed**

- Додано guarded `InternalOpsModule` з queue, detail, shared public timeline та transition routes під `/api/v1/internal/orders`.
- Queue використовує allowlisted `status`, derived `paymentOutcome`, date-range filters, bounded opaque cursor і `createdAt DESC, id DESC` sorting.
- Queue повертає `customerType`/`customerName`; detail повертає Customer `id`/`name`/`email`, а для Guest — лише `{ type: "GUEST" }`.
- OMS transition використовує `OrderTransitionPolicy` і в одній Prisma transaction виконує conditional Order update, `OrderStatusEvent(INTERNAL_OPS)` та `ActivityLog`.
- Додано isolated integration/E2E fixtures і regression coverage для RBAC, privacy, filtering, pagination, timeline, atomicity та concurrent/invalid transitions.

**Why**

- SupportManager/Admin отримали мінімальний operational Order API без supplier access або зміни customer/guest ownership.
- Internal DTO не розкриває raw PaymentEvent, Stripe metadata, guest hash, address чи supplier-internal дані.
- Stripe webhook залишається єдиною authority для переходу в `PAID`; internal API дозволяє лише послідовні post-payment transitions.

**Validation results**

- Focused unit regression — 5 suites, 45 tests пройдено.
- `internal-orders.int-spec.ts` — 5 tests пройдено.
- `internal-orders.e2e-spec.ts` — 4 tests пройдено.
- Existing `order-api.int-spec.ts` — 4 tests пройдено; `order-api.e2e-spec.ts` — 4 tests пройдено.
- `pnpm --filter api build` і `git diff --check` — пройдено.
- Schema/migrations/dependencies не змінювалися; demo seed і live Stripe/network не використовувалися.

---

## Milestone 10.3 - Customer and Support Returns API

### Goal

Реалізувати ownership-safe створення ReturnRequest і контрольований lifecycle для delivered OrderItem без refunds, shipping або Supplier access.

### Tasks

- [x] Додати Customer endpoint для створення/читання ReturnRequest власного delivered OrderItem.
- [x] Додати SupportManager endpoint для створення ReturnRequest від імені customer contact, включно з guest Order, з ActivityLog actor attribution.
- [x] Додати internal returns queue/detail з filters за status/date та bounded cursor pagination.
- [x] Реалізувати погоджені transitions через `ReturnTransitionPolicy`.
- [x] Реалізувати Customer cancel лише зі станів `REQUESTED`, `UNDER_REVIEW`, `APPROVED`.
- [x] Додати negative ownership, duplicate-open-return, invalid-state і role tests.

### Definition of Done

- [x] ReturnRequest створюється лише для delivered OrderItem.
- [x] Customer не може створити або прочитати ReturnRequest чужого OrderItem; Guest не має self-service endpoint.
- [x] Для одного OrderItem база й service не допускають більше одного unfinished ReturnRequest.
- [x] `REQUESTED -> UNDER_REVIEW -> APPROVED | REJECTED -> RECEIVED -> COMPLETED` і дозволений Customer cancel відповідають matrix.
- [x] Terminal states `REJECTED`, `COMPLETED`, `CANCELLED` не мають вихідних переходів.
- [x] Кожна create/transition action має атомарний ActivityLog без витоку internal metadata в customer response.

### Validation

```bash
pnpm --filter api test -- --runInBand return
pnpm --filter api test:int returns.int-spec.ts
pnpm --filter api test:e2e returns.e2e-spec.ts
pnpm --filter api build
```

### Implementation log

**What changed**

- Додано customer-only create/read/cancel routes та SupportManager/Admin create, queue, detail і transition routes для ReturnRequest.
- Ownership перевіряється server-side через `OrderItem -> Order -> customerId`; Guest не має self-service route, а SupplierUser не проходить internal RBAC boundary.
- `ReturnsService` перевіряє delivered Order, unfinished-return invariant і current status усередині Prisma transactions.
- Усі create/cancel/internal transition операції атомарно записують allowlisted `ActivityLog`; customer DTO не містить actor, audit, Note, payment або guest metadata.
- Додано suite-owned fixtures, integration та e2e regressions для ownership, Guest/role denial, concurrency, pagination, lifecycle і terminal states.

**Why**

- Закрито погоджений Customer/Support Returns lifecycle без додавання refund, shipping або Supplier flows.
- Service-level перевірки доповнюють partial unique database index і централізовану `ReturnTransitionPolicy`.
- Internal queue/detail надають SupportManager лише потрібний operational context із bounded deterministic pagination.

**Validation results**

- Focused unit regression `return` — 2 suites, 18 tests пройдено.
- `returns.int-spec.ts` — 5 tests пройдено на guarded `auto_parts_test`; committed migrations актуальні.
- `returns.e2e-spec.ts` — 2 tests пройдено на guarded `auto_parts_test`; live Stripe/network і demo seed не використовувалися.
- Targeted ESLint/Prettier і `pnpm --filter api build` — пройдено.
- Schema, migrations і dependencies не змінювалися.

---

## Milestone 10.4 - Internal Notes and ActivityLog API

### Goal

Додати internal-only operational context і tamper-evident audit reads без exposure у customer/supplier contracts.

### Tasks

- [x] Реалізувати SupportManager/Admin create/list Note для конкретного Order або ReturnRequest.
- [x] Заборонити update/hard delete; correction створювати новою Note з `correctsNoteId`.
- [x] Реалізувати Admin-only redaction з reason, tombstone semantics і ActivityLog без копіювання Note text.
- [x] Реалізувати scoped ActivityLog reads для SupportManager та global read-only audit для Admin.
- [x] Додати allowlisted filters за actor/action/resource/date, bounded pagination і deterministic sorting.
- [x] Додати regression tests, що Note/ActivityLog не з'являються в customer Order, Return або supplier OrderItem responses.

### Definition of Done

- [x] Note прив'язана рівно до одного Order або ReturnRequest і має persisted author.
- [x] Note text не можна тихо змінити; correction зберігає окрему хронологію.
- [x] Лише Admin виконує audited redaction; hard delete API відсутній.
- [x] SupportManager бачить лише operational activity пов'язаних Order/Return; Admin має global read-only view.
- [x] Customer і SupplierUser не можуть читати Note або ActivityLog через прямі чи вкладені responses.
- [x] ActivityLog не містить Note body, payment payload, Stripe metadata, address або secrets.

### Validation

```bash
pnpm --filter api test -- --runInBand note activity && pnpm --filter api test:int internal-notes-audit.int-spec.ts && pnpm --filter api test:e2e internal-notes-audit.e2e-spec.ts && pnpm --filter api test:e2e order-api.e2e-spec.ts supplier-order-items.e2e-spec.ts && pnpm --filter api build
```

### Implementation log

**What changed**

- Додано guarded Order/Return Note create/list routes, append-only corrections через same-target `correctsNoteId` і Admin-only redaction route.
- Redaction зберігає original body у persistence, але всі подальші DTO повертають tombstone `body: null`, `isRedacted: true` та redaction metadata.
- Додано read-only ActivityLog API з allowlisted actor/action/resource/date filters, bounded opaque cursor і `createdAt DESC, id DESC` sorting.
- SupportManager audit reads вимагають scope конкретного `ORDER` або `RETURN_REQUEST`; Admin має explicit global read bypass.
- Note create/correction/redaction та allowlisted audit record commit/rollback разом; ActivityLog metadata проєктує лише `noteId`/`correctsNoteId`, ніколи Note body.
- Додано suite-owned integration/E2E fixtures і regressions для RBAC, corrections, redaction, audit scope та customer/supplier DTO privacy.

**Why**

- Закрито internal operational context без update/hard-delete Note API та без exposure у Customer/Supplier boundaries.
- Append-only corrections і audited redaction зберігають хронологію, водночас tombstone projection прибирає sensitive text з API.
- Scoped Support audit зменшує privilege surface; global oversight залишається лише Admin read-only capability.

**Validation results**

- Focused unit `note activity` — 2 suites, 17 tests пройдено.
- `internal-notes-audit.int-spec.ts` — 3 tests пройдено на guarded `auto_parts_test`; 12 committed migrations актуальні.
- `internal-notes-audit.e2e-spec.ts` — 3 tests пройдено на guarded `auto_parts_test`, включно з Customer Order/Return і Supplier OrderItem privacy regressions.
- Targeted ESLint/Prettier, API build і `git diff --check` — пройдено.
- Schema, migrations і dependencies не змінювалися; demo seed та live Stripe/network не використовувалися.

---

## Milestone 10.5 - Admin moderation and Internal Ops readiness gate

### Goal

Завершити Admin moderation contract і довести, що Milestone 10 відтворюється на чистій БД, не порушує RBAC/privacy та готовий до frontend handoff.

### Tasks

- [x] Реалізувати Admin-only global Listing moderation queue з allowlisted filters і bounded pagination.
- [x] Перевикористати централізовану Listing transition policy для approve/reject і додати emergency pause з обов'язковою supplier-visible reason.
- [x] Записувати moderation ActivityLog атомарно; не дозволяти Admin редагувати supplier-owned Listing content.
- [x] Підтвердити, що Supplier API показує moderation result/reason, але не дозволяє змінити outcome.
- [x] Виконати clean-database rehearsal: migrations, focused integration/e2e regression, build і repository/query audit.
- [x] Оновити `CONTEXT.md`, `ARCHITECTURE.md`, API README та цей план лише за фактичними результатами реалізації.

### Definition of Done

- [x] Лише Admin може approve/reject/pause Listing через moderation API; SupportManager не має implicit moderation access.
- [x] Reject та emergency pause вимагають reason; Supplier бачить outcome/reason, але не internal audit.
- [x] Public Catalog/PDP/Cart продовжують повертати лише `ACTIVE` Listings.
- [x] Усі ключові Order, Return, Note/redaction і moderation actions мають ActivityLog.
- [x] Customer/Supplier privacy regressions, role matrix, ownership і transition tests проходять на guarded `auto_parts_test` без demo seed/live Stripe.
- [x] Чиста БД відтворюється committed migrations без drift; документація відповідає фактичному API.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
pnpm check-types
git diff --check
```

Під час readiness gate повний набір команд запускається один раз. Повторювати вже успішні checks без зміни відповідного коду не потрібно; у plan log фіксуються точні команди та результати.

### Implementation log

#### What changed

- Додано Admin-only moderation queue та canonical approve/reject/emergency-pause routes; попередні approve/reject routes залишено як сумісні aliases.
- Listing moderation використовує централізовану transition policy, atomic conditional update та `ActivityLog` в одній транзакції.
- Supplier projection повертає `moderationReason`; Supplier не може відновити Listing, призупинений Admin через emergency pause.
- Додано focused integration/e2e fixtures для role matrix, pagination, audit atomicity, supplier visibility та `ACTIVE`-only Catalog/PDP/Cart regressions.
- Оновлено context, architecture та API README відповідно до фактичного Internal Ops/moderation contract.

#### Validation results

- API build — пройдено.
- Focused unit policy/validation — 2 suites, 22 tests пройдено.
- Focused integration — 2 suites, 11 tests пройдено на guarded `auto_parts_test`; 12 migrations актуальні.
- Focused moderation e2e — 1 suite, 3 tests пройдено без demo seed або live Stripe/network.
- Clean rehearsal: усі 12 committed migrations застосовано до ізольованої `auto_parts_readiness_10_5`; після перевірки тимчасову БД видалено.
- Query audit підтвердив bounded deterministic moderation query; на порожній test fixture PostgreSQL обирає `Seq Scan + Sort`, тому новий індекс без production-like cardinality не додавався.
- Targeted ESLint завис без diagnostic output і був зупинений; build та компіляція тестів пройшли, остаточний whitespace audit виконано через `git diff --check`.
- Schema, migrations і dependencies не змінювалися.

## Migration and rollback strategy

- Створювати лише descriptive forward migrations для Milestone 10 schema additions; historical files є immutable.
- Перед додаванням partial unique/check constraints виконати read-only preflight на conflicting ReturnRequest/Note data. Якщо conflicts існують, migration має abort із зрозумілою помилкою, а не мовчки видаляти чи переписувати дані.
- Additive enum values, tables і nullable columns застосовувати до deployment коду, що їх використовує. Required invariants додавати після data-preserving validation/backfill, якщо backfill реально потрібний.
- Не використовувати `prisma db push` або `migrate reset` як rollback strategy.
- Application rollback виконується поверненням коду; additive schema залишається. Видалення додається лише окремою reviewed forward migration після перевірки, що старі дані більше не потрібні.
- Partial unique index для unfinished ReturnRequest та Note XOR check мають бути явно присутні у reviewed SQL і schema integration tests, навіть якщо Prisma DSL не виражає їх повністю.
- ActivityLog/Note records не видаляються під час rollback; redaction і retention потребують окремої accepted policy.

## Risks and mitigations

- **Privilege escalation:** explicit role matrix, centralized guards/policies, Admin bypass tests і negative SupportManager/SupplierUser/Customer cases.
- **Cross-customer return access:** ownership predicate через `OrderItem -> Order -> customerId` і однакові non-disclosing responses для missing/foreign IDs.
- **Invalid або duplicated return:** delivered-state check у transaction, partial unique index для unfinished request і concurrency integration test.
- **Skipped/out-of-order transitions:** expected current-status predicate, central transition matrix і terminal-state tests.
- **Unaudited state change:** state update та ActivityLog в одній DB transaction; failure будь-якого запису rollback-ить всю операцію.
- **Audit/Note data leak:** explicit DTO selects, no nested Note/ActivityLog in public responses і regression tests для customer/supplier API.
- **Sensitive data duplication:** allowlisted ActivityLog metadata; заборона Note body, payment payload, Stripe metadata, addresses і secrets.
- **Audit tampering:** append-only application API, відсутність update/delete routes і database permissions hardening як deployment follow-up.
- **Moderation bypass:** один Listing transition policy, Admin-only routes, mandatory reason і existing `ACTIVE` public predicate regressions.
- **Unbounded internal queries:** bounded cursor pagination, allowlisted filters, unique tie-breaker та query-plan review перед readiness sign-off.
- **Flaky/unsafe tests:** guarded `auto_parts_test`, suite-owned fixtures, deterministic cleanup, no demo seed і no live Stripe/network.
