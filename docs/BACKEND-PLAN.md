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
4. **Auth mechanism:** який session-compatible auth package або власний Nest adapter прийнятий для API? ТЗ допускає Better Auth або Auth.js-style sessions, але repository ще не фіксує provider.
5. **Role storage:** enum, role table або join model? Для MVP рекомендовано persisted role enum плюс окремий `SupplierUser` membership, який зв’язує `User` із `Supplier`.
6. **Status vocabulary:** остаточні enum values і дозволені transitions для Listing, Order, Payment і ReturnRequest мають бути погоджені до Milestone 6.3.

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
- [ ] Оновити integration tests на нову модель, включно з duplicate fitment rule, invalid foreign keys і delete policy.
- [ ] Переконатися, що generated client і Nest `PrismaService` продовжують збиратися без паралельного `PrismaClient`.

### Definition of Done

- [ ] Committed migration SQL не редагує попередні migrations і не містить неперевіреної втрати даних.
- [ ] Чиста `auto_parts_dev`/`auto_parts_test` відтворюється з migration history.
- [ ] Product → ProductVariant та taxonomy/fitment relations мають погоджені constraints й indexes.
- [ ] Відсутній FitmentRule не інтерпретується як підтверджена сумісність.
- [ ] Нові integration tests проходять, а старий Part/Vehicle/Fitment baseline або мігрований, або видалений лише після перевіреного backfill.

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

### Tasks

- [ ] Закрити Open questions 4–5 і задокументувати auth/session lifecycle, persisted roles та `SupplierUser` membership semantics.
- [ ] Додати Prisma models для `User`, `Session`, `CustomerProfile`, `SavedVehicle`, `Address`, `Supplier` і supplier membership із потрібними unique constraints та indexes.
- [ ] Реалізувати sign-up/sign-in/sign-out і session validation через один auth boundary у `apps/api`.
- [ ] Додати Nest guards/decorators або permission helpers для `Customer`, `SupplierUser`, `SupportManager`, `Admin`; `Guest` не зберігати як DB role.
- [ ] Реалізувати resource ownership check: SupplierUser працює лише з Supplier, з яким має активний membership.
- [ ] Додати unit/integration tests для auth lifecycle, expired/invalid session, role denial і cross-supplier denial.

### Definition of Done

- [ ] Auth provider/mechanism зафіксований, а session secret береться лише з environment configuration.
- [ ] Sign-up/sign-in/sign-out і protected Nest route працюють у integration/e2e environment.
- [ ] RBAC matrix має позитивні та негативні тести для всіх persisted roles.
- [ ] Supplier ownership перевіряється окремо від ролі й відхиляє cross-supplier access.
- [ ] У logs, fixtures, README та committed `.env.example` немає реальних credentials або session secrets.

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
```

## Milestone 6.3 — Seed + status baseline

### Goal

Зафіксувати status vocabulary для майбутніх Listing/Order/Payment/Return workflows і додати безпечний idempotent seed для локальної розробки та демонстраційних сценаріїв.

### Tasks

- [ ] Закрити Open question 6 таблицею allowed transitions і responsibility: хто та якою майбутньою дією може змінювати кожний status.
- [ ] Додати status enums і мінімально повні relations для `Listing`, `Order`, `OrderItem`, `PaymentEvent` та `ReturnRequest`, не реалізуючи їхні controllers/services.
- [ ] Зафіксувати `PaymentEvent.externalEventId` як idempotency key і relation ReturnRequest → конкретний OrderItem; runtime webhook/return behavior залишити Milestones 8/10.
- [ ] Налаштувати Prisma 7 seed command у `prisma.config.ts` і додати workspace script лише якщо він спрощує фактичний pnpm workflow.
- [ ] Створити idempotent seed для ролей, fake local users, suppliers, vehicle taxonomy, catalog, fitment rules і кількох listings/status scenarios.
- [ ] Розділити demo seed та test setup: integration tests не повинні залежати від випадково залишених seed records.

### Definition of Done

- [ ] Status enums і defaults узгоджені з майбутніми Milestones 8–10 та не реалізують непогоджених payment/shipping rules.
- [ ] `prisma db seed` можна виконати двічі без duplicate-key errors або дублювання fixtures.
- [ ] Seed використовує лише synthetic local data й не містить production secrets або персональних даних.
- [ ] PaymentEvent має database-level idempotency constraint, а ReturnRequest прив’язаний до одного OrderItem.
- [ ] Чиста database після `migrate deploy` + `db seed` містить достатній baseline для наступного Catalog API milestone.

### Validation

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api exec prisma db seed
pnpm --filter api exec prisma db seed
pnpm --filter api test:int
pnpm --filter api build
```

## Milestone 6.4 — Foundation readiness gate

### Goal

Перевірити весь Milestone 6 як одну відтворювану backend foundation і підготувати documented handoff для Milestone 7 без додавання нової функціональності.

### Tasks

- [ ] Відтворити `auto_parts_dev` і `auto_parts_test` лише з committed migrations; окремо виконати idempotent seed для development database.
- [ ] Запустити regression suites для catalog/fitment constraints, auth/session lifecycle, RBAC, supplier ownership і status defaults.
- [ ] Перевірити, що test database guard усе ще відхиляє dev/prod/remote database і що cleanup не залежить від seed.
- [ ] Оновити `docs/CONTEXT.md`, `docs/ARCHITECTURE.md` та `apps/api/README.md` відповідно до фактично реалізованої моделі й команд.
- [ ] Перевірити repository diff на credentials, generated artifacts, edited historical migrations і незаплановані зміни поза `apps/api`/docs.
- [ ] Оновити checklist та Implementation log цього плану лише після фактичної перевірки.

### Definition of Done

- [ ] Усі Milestones 6.1–6.3 мають `[x]` лише після проходження їх Validation.
- [ ] Clean database rehearsal, seed rerun, unit, integration та e2e suites проходять повторювано.
- [ ] Documentation і package scripts відповідають фактичним paths, versions і commands.
- [ ] Немає pending migrations, schema drift, tracked secrets або generated Prisma Client artifacts.
- [ ] Milestone 7 може початися без відкритих schema/auth/ownership питань, що змінюють його API design.

### Validation

```bash
pnpm lint
pnpm check-types
pnpm build
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api exec prisma db seed
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
git diff --check
```

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
