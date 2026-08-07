# Execution plan: Backend domain foundation, Auth/RBAC і seed baseline

## Summary

Розширити завершений Prisma/NestJS baseline від `Part`, `Vehicle`, `Fitment` до узгодженої backend foundation із catalog/vehicle taxonomy, identity та supplier ownership, статусними моделями й відтворюваними seed-даними. Великий Milestone 6 поділений на послідовні під-етапи 6.1–6.4, кожен із власною migration boundary та окремою перевіркою.

Цей план готує persistence і security foundation для майбутніх Milestones 7–10, але не реалізує storefront API, checkout, supplier cabinet або CRM/OMS behavior.

## Goal

Після завершення плану `apps/api` має узгоджену цільову Prisma schema для catalog, vehicle taxonomy, users/suppliers і базових commerce/support records; NestJS має session-based authentication та RBAC; локальна база відтворюється з committed migrations і idempotent seed. Наступний milestone може будувати fitment-aware Catalog API без повторного проєктування identity, ownership або основних relations.

## Non-goals

- Frontend, Next.js route groups або UI для storefront/account/supplier/dashboard.
- Public Catalog/PDP endpoints, vehicle selector API або saved-vehicle UX.
- Cart behavior, Stripe Checkout, webhook processing або payment state transitions у runtime.
- Supplier cabinet endpoints, stock editing workflow або payouts.
- CRM/OMS queues, moderation behavior, internal notes або return-processing services.
- VIN decoder, ACES/PIES import, shipping integrations, warehouse routing, dynamic pricing, analytics або AI compatibility scoring.
- Production deployment, production secrets, backup/restore або managed PostgreSQL provisioning.

## Context inspected

- `docs/PRISMA-PLAN.md` — завершений Prisma/PostgreSQL baseline і формат milestone/validation.
- `docs/PLANS.md` — вимоги до execution plans і статусів `[ ]`, `[~]`, `[x]`, `[!]`.
- `docs/CONTEXT.md` — поточна реалізована модель `Part`, `Vehicle`, `Fitment` та нереалізовані auth/commerce домени.
- `docs/ARCHITECTURE.md` — persistence ownership у `apps/api` і єдиний `PrismaModule`/`PrismaService`.
- `apps/api/prisma/schema.prisma` і committed migrations — фактичні поля, constraints і cascade policy baseline.
- `apps/api/prisma.config.ts` — Prisma 7 datasource/migration configuration; seed command ще не налаштований.
- `apps/api/package.json` — фактичні Prisma, build, unit, integration та e2e scripts.
- `apps/api/test` — ізольована `auto_parts_test`, migration setup і persistence integration tests.

## Current behavior

`apps/api` використовує Prisma `7.9.0`, PostgreSQL 16 і один Nest-managed `PrismaService`. Поточна schema містить лише `Part`, `Vehicle` та explicit join model `Fitment`. Integration tests перевіряють create/read, unique fitment, foreign keys і cascade delete в локальній `auto_parts_test`.

Наразі немає:

- `Product`, `ProductVariant`, `FitmentRule` і vehicle taxonomy;
- users, sessions, roles, customer/supplier ownership;
- auth endpoints, guards або permission policy;
- `Listing`, `Order`, `PaymentEvent`, `ReturnRequest` і погоджених статусів;
- Prisma seed configuration або відтворюваних demo/test fixtures.

## Desired behavior

- Catalog vocabulary чітко розділяє canonical product data, purchasable variant/SKU і supplier offer: `Product` → `ProductVariant` → `Listing`.
- Vehicle taxonomy підтримує майбутній guided flow `Year → Make → Model → Generation → Engine`, а `FitmentRule` не заявляє compatibility без явного rule.
- Перехід від `Part/Vehicle/Fitment` виконується новими reviewed migrations без редагування наявної migration history.
- `User`, session, role і supplier membership мають однозначну ownership model.
- `Guest` є неавтентифікованим станом, а не persisted role; persisted ролі — `Customer`, `SupplierUser`, `SupportManager`, `Admin`.
- Status values для Listing, Order, Payment і ReturnRequest зафіксовані до реалізації runtime workflows.
- Seed запускається явно через `prisma db seed`, є idempotent і не містить реальних credentials.
- Усі database integration/e2e tests продовжують працювати лише з локальною `auto_parts_test`.

## Constraints

- Persistence, generated Prisma Client і auth implementation належать лише `apps/api`.
- Використовувати поточні Prisma `7.9.0`, PostgreSQL 16, Node.js `>=22.12.0 <23`, pnpm і NestJS 11; не змінювати frontend stack.
- Не редагувати вже committed migration files. Кожен під-етап створює нову migration або явно документує, чому schema migration не потрібна.
- Для potentially destructive rename/drop використовувати expand → backfill → contract або інший reviewed data-preserving path; не покладатися на `db push`.
- `prisma migrate dev` використовувати лише локально для створення migration; committed migrations перевіряти через `prisma migrate deploy`.
- Після schema changes явно запускати `prisma generate`; Prisma 7 не вважається таким, що гарантовано генерує client після migration command.
- Seed запускається окремо; migrations не повинні неявно створювати demo users або catalog data.
- Реальні `.env`, passwords, session secrets, Stripe secrets та production credentials не commit-ити й не показувати в документації.
- RBAC не замінює resource ownership: роль `SupplierUser` сама по собі не дає доступ до даних іншого Supplier.
- Milestones 7–10 залишаються поза цим планом; у Milestone 6 не додавати їхні public APIs або runtime workflows.

## Open questions

Ці рішення мають бути закриті у відповідному під-етапі до створення його migration або auth implementation:

1. **Part mapping:** чи є поточний `Part` майбутнім `Product`, чи `ProductVariant`? Рекомендований baseline — `Part` ближчий до `ProductVariant`, бо вже містить manufacturer part number; `Product` групує один або кілька variants.
2. **Vehicle mapping:** як перенести `Vehicle(make, model, year)` у taxonomy `VehicleMake/VehicleModel/VehicleGeneration/EngineType`, якщо current records не містять generation та engine?
3. **Fitment granularity:** `FitmentRule` посилається на точну vehicle configuration чи підтримує year range й optional engine? До рішення не додавати compatibility confidence/scoring.
4. **Auth mechanism — resolved for Milestone 6.2:** Better Auth із Prisma adapter через єдиний Nest `AuthModule` і наявний `PrismaService`. Підтримуються email/password та OAuth 2.0 лише через Google; сесії persisted у PostgreSQL.
5. **Role storage — resolved for Milestone 6.2:** один persisted role enum на `User` (`Customer`, `SupplierUser`, `SupportManager`, `Admin`) плюс окремий supplier membership. `Guest` не є persisted role; один `SupplierUser` належить рівно одному Supplier у межах цього milestone.
6. **Status vocabulary — resolved for Milestone 6.3:** погоджені enum values, defaults, terminal states, allowed transitions і responsibility для `Listing`, `Order`, append-only `PaymentEvent` та `ReturnRequest`; authoritative matrices зафіксовані в Milestone 6.3.

## Proposed approach

Роботу виконувати послідовно, не в одній mega-migration:

```text
Current Part / Vehicle / Fitment baseline
  -> 6.1 catalog + vehicle taxonomy migration and data mapping
  -> 6.2 users, sessions, roles, suppliers and ownership
  -> 6.3 status-bearing records and idempotent seed
  -> 6.4 clean-database rehearsal and foundation readiness gate
  -> Milestone 7 fitment-aware Catalog API
```

Recommended domain split:

- `Product` — canonical catalog concept and descriptive grouping.
- `ProductVariant` — concrete SKU/OEM/manufacturer part number that receives fitment rules.
- `Listing` — supplier-owned commercial offer for one ProductVariant; price, stock and approval state belong here, not on Product.
- Vehicle taxonomy — normalized make/model/generation/engine vocabulary used by saved vehicles and fitment.
- `FitmentRule` — explicit compatibility record; absence of a rule must never mean compatible.
- `User` — authentication identity; customer profile and supplier membership are separate domain relations.
- `SupplierUser` — membership/ownership link, not a synonym for every User with a supplier-facing role.

## Milestone 6.1 — Domain schema migration

### Goal

Замінити спрощений catalog/vehicle persistence baseline на узгоджену модель `Product`, `ProductVariant`, `FitmentRule` і vehicle taxonomy, зберігши migration history та перевірювану поведінку compatibility relations.

### Tasks

- [x] Закрити Open questions 1–3 і зафіксувати канонічні визначення Product, ProductVariant, vehicle taxonomy та FitmentRule у domain documentation.
- [x] Спроєктувати `Category`, `Brand`, `Product`, `ProductVariant`, `VehicleMake`, `VehicleModel`, `VehicleGeneration`, `EngineType` і `FitmentRule` з nullability, unique constraints, indexes та referential actions.
- [x] Визначити data-mapping для existing `Part`, `Vehicle`, `Fitment`; для неоднозначних records обрати явний backfill/caution path, а не вигадувати generation або engine.
- [x] Створити нову reviewed migration; якщо потрібне перейменування або видалення старих tables, розділити expand/backfill/contract на безпечні кроки.
- [x] Оновити integration tests на нову модель, включно з duplicate fitment rule, invalid foreign keys і delete policy.
- [x] Переконатися, що generated client і Nest `PrismaService` продовжують збиратися без паралельного `PrismaClient`.

### Definition of Done

- [x] Committed migration SQL не редагує попередні migrations і не містить неперевіреної втрати даних.
- [x] Чиста `auto_parts_dev`/`auto_parts_test` відтворюється з migration history.
- [x] Product → ProductVariant та taxonomy/fitment relations мають погоджені constraints й indexes.
- [x] Відсутній FitmentRule не інтерпретується як підтверджена сумісність.
- [x] Нові integration tests проходять, а старий Part/Vehicle/Fitment baseline або мігрований, або видалений лише після перевіреного backfill.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api test:int
pnpm --filter api build
```

## Milestone 6.2 — Auth/RBAC + Users/Suppliers

### Goal

Додати session-based authentication, persisted users/sessions і role-aware Nest authorization з окремою supplier ownership relation.

### Decisions

- Better Auth із Prisma adapter є єдиним auth boundary у `apps/api` та інтегрується через один Nest `AuthModule`, повторно використовуючи наявний `PrismaService`.
- Доступні способи входу: email/password та OAuth 2.0 лише через Google.
- `Session` зберігається в PostgreSQL. Клієнт отримує session cookie з `HttpOnly`, `SameSite=Lax` і `Secure` у production; строк дії — 7 днів, активна сесія оновлюється не частіше ніж раз на 24 години.
- Sign-out видаляє поточну сесію; зміна пароля або блокування User анулює всі його сесії. Redis і cookie-based session cache не входять у Milestone 6.2.
- `User` має рівно одну persisted роль: `Customer`, `SupplierUser`, `SupportManager` або `Admin`; `Guest` означає неавтентифікований request і не зберігається в БД.
- Один `Supplier` може мати багато memberships, але один `SupplierUser` належить рівно одному Supplier. Membership має стан `Active` або `Disabled`; invitations і supplier-specific підролі поза scope.
- Supplier ownership перевіряється окремо від RBAC за active membership і збігом `supplierId`. `Admin` має глобальний доступ; `SupportManager` не отримує supplier write-access автоматично.

### Tasks

- [x] Закрити Open questions 4–5 і задокументувати auth/session lifecycle, persisted roles та `SupplierUser` membership semantics.
- [x] Додати Prisma models для `User`, `Session`, `Account`, `Verification`, `CustomerProfile`, `SavedVehicle`, `Address`, `Supplier` і supplier membership із потрібними unique constraints та indexes; auth-managed models узгодити з вимогами Better Auth Prisma adapter.
- [x] Реалізувати email/password sign-up/sign-in, Google OAuth, sign-out і session validation через один Better Auth boundary у `apps/api`.
- [x] Додати Nest guards/decorators або permission helpers для `Customer`, `SupplierUser`, `SupportManager`, `Admin`; `Guest` не зберігати як DB role.
- [x] Реалізувати resource ownership check: SupplierUser працює лише з Supplier, з яким має active membership; disabled і cross-supplier memberships не дають доступу.
- [x] Додати unit/integration tests для cookie/session lifecycle, expired/invalid session, sign-out і password-change revocation, role denial, disabled membership та cross-supplier denial.

### Definition of Done

- [x] Better Auth із Prisma adapter налаштований через один Nest auth boundary, а session secret і Google OAuth credentials беруться лише з environment configuration.
- [x] Email/password sign-up/sign-in, Google OAuth initiation, sign-out і protected Nest route працюють у integration/e2e environment; зовнішній Google callback залишається provider boundary і не викликається тестами.
- [x] Session cookie має погоджені security attributes, а expiration, refresh і revocation перевірені тестами.
- [x] RBAC matrix має позитивні та негативні тести для всіх persisted roles.
- [x] Supplier ownership перевіряється окремо від ролі й відхиляє disabled membership та cross-supplier access; `SupportManager` не отримує supplier write-access без окремого дозволу.
- [x] У logs, fixtures, README та committed `.env.example` немає реальних credentials або session secrets.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api lint
pnpm check-types
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
```

Validation result:

- Prisma `7.9.0` schema validation і client generation проходять; усі 3 committed migrations застосовані до `auto_parts_dev`, pending migrations немає.
- API lint, workspace `check-types`, API build і unit suite проходять.
- Integration suite проходить 9/9 тестів на ізольованій `auto_parts_test`; e2e suite проходить 11/11 тестів.
- Tracked configuration містить лише placeholder values у `apps/api/.env.example` та synthetic test credentials у Jest setup.

Implementation log:

- Додано Better Auth boundary для email/password і Google OAuth, PostgreSQL sessions із 7-денним TTL, 24-годинним refresh threshold та без cookie session cache.
- Session lifecycle regression перевіряє cookie attributes, sign-in/sign-out, invalid/expired session, refresh, password-change rotation і відкликання сесій заблокованого User.
- `SessionAuthGuard` і `RolesGuard` реалізують authenticated request та RBAC для `Customer`, `SupplierUser`, `SupportManager`, `Admin`; `Guest` залишається неавтентифікованим станом.
- `SupplierOwnershipGuard` окремо перевіряє active membership і збіг `supplierId`; e2e regression покриває matching, disabled, cross-supplier, SupportManager denial та Admin bypass.
- Google OAuth regression перевіряє формування authorization URL і callback через публічний Better Auth endpoint без зовнішнього запиту до Google.

Verification steps:

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api lint
pnpm check-types
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
git diff --check
```

## Milestone 6.3 — Seed + status baseline

### Goal

Зафіксувати status vocabulary для майбутніх Listing/Order/PaymentEvent/ReturnRequest workflows і додати безпечний idempotent seed для локальної розробки та демонстраційних сценаріїв.

### Decisions

- Milestone 6.3 додає лише persistence baseline: status enums, relations, constraints, committed migration і demo seed. Controllers, Stripe/webhook processing, fulfillment, refunds, moderation services та автоматичне виконання transitions залишаються Milestones 8–10.
- `ListingStatus` має values `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `PAUSED`, `REJECTED`, `ARCHIVED`; default — `DRAFT`, terminal state — `ARCHIVED`.
- `OrderStatus` має values `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`; default — `PENDING_PAYMENT`, terminal states — `DELIVERED` і `CANCELLED`.
- `PaymentEventProcessingStatus` має values `RECEIVED`, `PROCESSED`, `FAILED`; default — `RECEIVED`, terminal states — `PROCESSED` і `FAILED`. `PaymentEvent` є append-only записом зовнішньої події, а не mutable payment lifecycle.
- `ReturnRequestStatus` має values `REQUESTED`, `APPROVED`, `REJECTED`, `RECEIVED`, `COMPLETED`, `CANCELLED`; default — `REQUESTED`, terminal states — `REJECTED`, `COMPLETED` і `CANCELLED`.

#### Allowed transitions and responsibility

| Record | From | To | Future actor/responsibility |
| --- | --- | --- | --- |
| Listing | `DRAFT` | `PENDING_APPROVAL`, `ARCHIVED` | SupplierUser із matching active Supplier membership |
| Listing | `PENDING_APPROVAL` | `ACTIVE`, `REJECTED` | SupportManager або Admin |
| Listing | `ACTIVE` | `PAUSED`, `ARCHIVED` | SupplierUser-власник |
| Listing | `PAUSED` | `ACTIVE`, `ARCHIVED` | SupplierUser-власник |
| Listing | `REJECTED` | `DRAFT`, `ARCHIVED` | SupplierUser-власник після виправлення або відмови від Listing |
| Order | `PENDING_PAYMENT` | `PAID` | Майбутній payment webhook/system process |
| Order | `PENDING_PAYMENT` | `CANCELLED` | Customer або timeout job |
| Order | `PAID` | `PROCESSING` | SupplierUser-власник |
| Order | `PROCESSING` | `SHIPPED` | SupplierUser-власник |
| Order | `SHIPPED` | `DELIVERED` | SupportManager, Admin або майбутня delivery integration |
| PaymentEvent | `RECEIVED` | `PROCESSED`, `FAILED` | Майбутній webhook-processing service |
| ReturnRequest | `REQUESTED` | `APPROVED`, `REJECTED` | SupportManager або Admin |
| ReturnRequest | `REQUESTED` | `CANCELLED` | Customer-власник request |
| ReturnRequest | `APPROVED` | `RECEIVED` | SupportManager або Admin |
| ReturnRequest | `RECEIVED` | `COMPLETED` | SupportManager або Admin |

Прямий Listing transition `DRAFT` → `ACTIVE`, Order cancellation після `PAID`, автоматичні cross-record transitions, refund/replacement outcome і payment/shipping side effects не входять у Milestone 6.3.

#### Demo seed boundary and scope

- `prisma db seed` має hard guard і дозволяється лише для PostgreSQL на `localhost`/`127.0.0.1`/`[::1]` з database name `auto_parts_dev`; `auto_parts_test`, remote hosts і невідомі database names відхиляються.
- Demo seed використовує `upsert` із stable natural keys (`email`, Supplier `slug`, SKU, `externalEventId`) та deterministic IDs для scenario records без natural key.
- Seed створює 2 Suppliers і 5 domain-only Users: Customer, по одному SupplierUser на Supplier, SupportManager та Admin. Він не створює `Account.password`, `Session` або `Verification` records і не містить login credentials.
- Catalog/taxonomy scope: 2 Categories, 2 Brands, 3 Products, 4 ProductVariants, невелика vehicle taxonomy та 4–6 explicit FitmentRules.
- Scenario scope: Listings для основних status states, Orders у `PENDING_PAYMENT` і `DELIVERED`, PaymentEvents у `PROCESSED` і `FAILED`, ReturnRequests у `REQUESTED` і `COMPLETED`.
- Integration/e2e setup застосовує лише committed migrations; кожен test suite створює та очищає власні fixtures, не імпортує demo seed і не залежить від seeded IDs або row counts.

### Tasks

- [x] Закрити Open question 6 таблицею allowed transitions і responsibility: хто та якою майбутньою дією може змінювати кожний status.
- [x] Додати status enums і мінімально повні relations для `Listing`, `Order`, `OrderItem`, `PaymentEvent` та `ReturnRequest`, не реалізуючи їхні controllers/services.
- [x] Зафіксувати `PaymentEvent.externalEventId` як unique idempotency key, append-only event semantics і relation ReturnRequest → конкретний OrderItem; runtime webhook/return behavior залишити Milestones 8/10.
- [x] Налаштувати Prisma 7 seed command у `prisma.config.ts` і додати workspace script лише якщо він спрощує фактичний pnpm workflow.
- [x] Створити idempotent seed для synthetic Users, що покривають усі persisted roles, двох Suppliers, vehicle taxonomy, catalog, fitment rules і погоджених Listing/Order/PaymentEvent/ReturnRequest scenarios.
- [x] Додати hard guard лише для локальної `auto_parts_dev`; demo Users залишити domain-only без password Accounts, Sessions або Verification records.
- [x] Розділити demo seed та test setup: integration/e2e tests не запускають і не імпортують demo seed та не залежать від випадково залишених seed records.
- [x] Додати integration regression для enum defaults, database constraints та test isolation; стабільні row counts після подвійного seed перевіряти guarded CLI validation, а unsafe targets — unit regression guard.

### Definition of Done

- [x] Status enums, defaults, terminal states і allowed transitions відповідають matrices вище та не реалізують непогоджених payment/shipping/refund rules.
- [x] `prisma db seed` можна виконати двічі без duplicate-key errors, дублювання fixtures або зміни counts для seed-owned records.
- [x] Seed використовує лише synthetic local data й не містить production secrets або персональних даних.
- [x] PaymentEvent має database-level unique idempotency constraint і append-only baseline, а ReturnRequest прив’язаний до одного OrderItem.
- [x] Seed відхиляє `auto_parts_test` і remote/unknown targets; integration/e2e suites залишаються зеленими без demo seed.
- [x] Чиста database після `migrate deploy` + `db seed` містить достатній baseline для наступного Catalog API milestone.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api exec prisma db seed
pnpm --filter api exec prisma db seed
pnpm --filter api lint
pnpm check-types
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
git diff --check
```

Validation двічі запускає seed проти guarded local `auto_parts_dev`; однаковий CLI summary підтверджує стабільні row counts, а integration regression — незалежність test fixtures від demo seed.

### Implementation log

#### What changed

- Додано status enums, мінімальні commerce relations і forward migration для `Listing`, `Order`, `OrderItem`, `PaymentEvent` та `ReturnRequest`.
- Налаштовано Prisma 7 seed boundary із hard guard лише для локальної `auto_parts_dev`.
- Додано synthetic idempotent demo seed із natural-key upserts, deterministic scenario IDs і summary seed-owned counts.
- Додано unit regression для unsafe seed targets та integration regression для enum defaults, foreign keys, payment-event idempotency і незалежності `auto_parts_test` від demo seed.

#### Why

- Зафіксовано persistence/status baseline для майбутніх Catalog, checkout/payment та returns milestones без передчасної runtime workflow logic.
- Чиста локальна database після committed migrations і demo seed містить відтворювані catalog, taxonomy та commerce scenarios.

#### Verification results

- Prisma schema/client/migration status — green; чотири committed migrations застосовані.
- Два послідовні seed runs — green із однаковими counts; demo `Account`, `Session` і `Verification` counts дорівнюють нулю.
- Unit — 2 suites / 10 tests; integration — 4 suites / 14 tests; e2e — 4 suites / 11 tests.
- API lint, root type checks, API build і `git diff --check` — green.

## Milestone 6.4 — Foundation readiness gate

### Goal

Перевірити весь Milestone 6 як одну відтворювану backend foundation і підготувати documented handoff для Milestone 7 без додавання нової функціональності.

### Tasks

- [x] Відтворити `auto_parts_dev` і `auto_parts_test` лише з committed migrations; окремо виконати idempotent seed для development database.
- [x] Запустити regression suites для catalog/fitment constraints, auth/session lifecycle, RBAC, supplier ownership і status defaults.
- [x] Перевірити, що test database guard усе ще відхиляє dev/prod/remote database і що cleanup не залежить від seed.
- [x] Оновити `docs/CONTEXT.md`, `docs/ARCHITECTURE.md` та `apps/api/README.md` відповідно до фактично реалізованої моделі й команд.
- [x] Перевірити repository diff на credentials, generated artifacts, edited historical migrations і незаплановані зміни поза `apps/api`/docs.
- [x] Оновити checklist та Implementation log цього плану лише після фактичної перевірки.

### Definition of Done

- [x] Усі Milestones 6.1–6.3 мають `[x]` лише після проходження їх Validation.
- [x] Clean database rehearsal, seed rerun, unit, integration та e2e suites проходять повторювано.
- [x] Documentation і package scripts відповідають фактичним paths, versions і commands.
- [x] Немає pending migrations, schema drift, tracked secrets або generated Prisma Client artifacts.
- [x] Milestone 7 може початися без відкритих schema/auth/ownership питань, що змінюють його API design.

### Validation

```bash
pnpm lint
pnpm check-types
pnpm build
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
pnpm --filter api exec prisma db seed
pnpm --filter api exec prisma db seed
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
git diff --check
```

### Implementation log

#### What changed

- Відтворено Docker `auto_parts_dev` і `auto_parts_test` з чотирьох committed migrations; dev seed виконано двічі зі стабільними counts.
- Docker PostgreSQL 16 перенесено на host port `5433`, оскільки port `5432` на development machine належав окремому Windows PostgreSQL 17 instance.
- Додано прямий unit regression для test database guard і виправлено Turborepo API build output на `dist/**`.
- Оновлено context, architecture та API setup документацію відповідно до фактичної моделі й команд.

#### Why

- Clean rehearsal підтвердив, що foundation відтворюється без `db push`, manual SQL або demo seed у test database.
- Milestone 7 отримує стабільні schema, auth/RBAC та supplier ownership contracts без невирішених design blockers.

#### Verification results

- PostgreSQL 16.14 Docker baseline: dev/test migration status up to date; schema drift — `No difference detected`.
- Seed rerun: однакові counts; demo Accounts, Sessions і Verifications — `0`.
- Root lint, type checks і build — green; unit — 3 suites / 17 tests; integration — 4 / 14; e2e — 4 / 11.
- Historical migrations, tracked secrets і generated Prisma artifacts не знайдені; `git diff --check` — green.

#### Milestone 7 handoff

- Catalog, taxonomy, fitment, identity, session, RBAC, supplier ownership і commerce status persistence є canonical foundation.
- Наступний milestone може додавати catalog/PDP/fitment API без зміни погоджених schema/auth/ownership contracts.
- Checkout, payment processing, shipping, stock reservation і returns workflow залишаються поза поточним scope.

## Migration and rollback strategy

- Кожен schema-bearing під-етап створює нову forward migration; existing migration files не редагувати.
- Для 6.1 спочатку додавати target tables/columns, потім backfill, і лише після перевірки прибирати legacy structures окремим contract step.
- Migration SQL переглядати до apply; destructive statements повинні мати явне data-preservation explanation у Implementation log.
- `prisma migrate deploy` застосовує committed migrations; він не створює migrations, не запускає seed і не генерує Prisma Client.
- Rollback у середовищі з даними — тільки reviewed forward fix або restore procedure. `migrate reset` не є rollback strategy.
- Local disposable database можна пересоздати лише після точного test/dev target guard; production/shared URL не reset/drop-ити.

## Risks and mitigations

- **Подвійна catalog model.** Не залишати одночасно канонічні `Part` і `ProductVariant`; спочатку погодити mapping, потім мігрувати consumers/tests.
- **Вигадана vehicle precision.** Не backfill-ити generation/engine довільними значеннями; використовувати явну incomplete mapping policy.
- **Надто рання commerce logic.** У 6.3 фіксуються records/status vocabulary, але Stripe, checkout, stock reservation і returns behavior залишаються майбутнім milestones.
- **Role/ownership confusion.** RBAC відповідає на «що дозволено ролі», supplier membership — «до чиїх даних є доступ»; перевіряти обидва рівні.
- **Enum lock-in.** Перед migration погодити status transitions і terminal states; зміни PostgreSQL enums надалі робити тільки новими migrations.
- **Seed coupling.** Tests створюють власні fixtures й очищають їх; demo seed не є прихованою test prerequisite.
- **Migration drift.** Не використовувати `db push` як заміну committed migrations; перевіряти clean deploy і migrate status у кожному schema milestone.
- **Secret leakage.** Commit лише safe example configuration і synthetic seed data; auth/session secrets залишаються поза Git.
