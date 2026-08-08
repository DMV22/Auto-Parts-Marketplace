# Execution plan: Fitment-aware Catalog API

## Summary

Реалізувати Milestone 7 як стабільний read-oriented NestJS API поверх foundation, завершеної в Milestone 6. API має підтримувати послідовний vehicle selector `Year -> Make -> Model -> Generation -> Engine`, приватний customer garage, публічний catalog search із фільтрами та PDP із явною fitment-відповіддю.

Milestone розбито на підетапи 7.1-7.5. Кожен підетап додає окремий API boundary і regression coverage; schema changes допускаються лише там, де фактична модель Milestone 6 не може виразити погоджений API contract.

## Goal

Після завершення плану `apps/api` надає передбачуваний і протестований API для vehicle taxonomy, garage, catalog search та product details. Клієнт може вибрати або зберегти конкретний vehicle context, отримати paginated catalog result і побачити `compatible`, `incompatible`, `unknown` або `caution` без припущення, що відсутній `FitmentRule` означає сумісність.

## Non-goals

- Frontend vehicle selector, garage UI, catalog pages або PDP components.
- Створення чи редагування Product, ProductVariant, Listing, Supplier або vehicle taxonomy через публічний API.
- Supplier cabinet, listing approval, inventory write operations або stock reservation.
- Cart, checkout, Stripe, Order workflows, shipping, returns або moderation.
- VIN decoding, ACES/PIES import, fuzzy vehicle matching або AI compatibility scoring.
- Elasticsearch/OpenSearch, окремий search service, Redis cache або CDN strategy.
- Production deployment, rate-limiting platform, analytics або observability rollout.

## Context inspected

- `docs/BACKEND-PLAN.md` - завершений Milestone 6, plan structure, schema/auth/ownership decisions і handoff для Milestone 7.
- `docs/PLANS.md` - execution-plan format і статуси `[ ]`, `[~]`, `[x]`, `[!]`.
- `docs/CONTEXT.md` - фактичний backend stack, local workflow і test database boundary.
- `docs/ARCHITECTURE.md` - Nest/Prisma persistence boundary, auth/RBAC і current non-goals.
- `apps/api/prisma/schema.prisma` - canonical catalog, taxonomy, SavedVehicle, FitmentRule і Listing fields/relations.
- `apps/api/src/auth` - session, role та ownership guards/decorators, які мають захищати garage endpoints.
- `apps/api/package.json` - Prisma, lint, type-check, unit, integration, e2e та build scripts.
- `apps/api/test` - isolated `auto_parts_test` setup і поточний regression baseline.

## Current behavior

Milestone 6 надає persistence і security foundation, але не public catalog controllers/services. Prisma schema вже містить:

- `VehicleMake -> VehicleModel -> VehicleGeneration -> EngineType` із year ranges на generation;
- `User -> SavedVehicle`, де SavedVehicle посилається на generation та optional engine;
- `Category -> Product -> ProductVariant`, Brand і supplier-owned Listing;
- positive-only `FitmentRule` для ProductVariant, generation та optional engine;
- session-based Better Auth, RBAC і supplier ownership boundary.

Поточні schema gaps, важливі для Milestone 7:

- SavedVehicle не зберігає конкретний selected year і не має persisted active-selection contract;
- Listing не має condition field, хоча Milestone 7 вимагає condition filter;
- FitmentRule підтверджує лише позитивну сумісність і не визначає самостійно доказ для `incompatible`;
- API-wide DTO validation, pagination envelope і public error contract ще не зафіксовані.

## Desired behavior

- Public taxonomy endpoints повертають лише валідні наступні кроки selector flow і мають deterministic ordering.
- Authenticated Customer керує лише власними SavedVehicle records і може вибрати не більше одного active vehicle.
- Public catalog показує лише `ACTIVE` Listings, підтримує keyword/SKU та погоджені filters, pagination і explicit sorting allowlist.
- Vehicle filter повертає variant/listing як compatible лише за явним matching FitmentRule.
- PDP агрегує Product, variants, OEM/SKU, public Supplier data, Listing price/stock та fitment details без витоку internal records.
- Fitment evaluator повертає один із чотирьох стабільних result values із machine-readable reason, а incomplete selection або coverage не маскується під гарантовану сумісність.
- Unit, integration та e2e tests використовують лише local `auto_parts_test` і не залежать від demo seed.

## Constraints

- Реалізація належить лише `apps/api`; frontend і shared UI packages не змінювати.
- Використовувати поточні Node.js `>=22.12.0 <23`, NestJS 11, Prisma `7.9.0`, PostgreSQL 16 і pnpm.
- Зберегти один Nest `PrismaModule`/`PrismaService`; не створювати паралельні Prisma Client instances у controllers або services.
- Не редагувати historical migrations. Будь-який schema gap закривати новою reviewed forward migration після рішення відповідного Open question.
- Public taxonomy/catalog/PDP endpoints не потребують session. Garage і звернення через `savedVehicleId` потребують valid session та ownership check за `User.id`.
- Public catalog ніколи не повертає non-`ACTIVE` Listing. `stockQuantity = 0` не приховувати неявно: availability контролюється explicit filter або response field.
- Відсутній matching FitmentRule ніколи не означає `compatible`. `incompatible` дозволено повертати лише за погодженим доказом, а не через просту відсутність row.
- Pagination має bounded page size: default `20`, maximum `50`; кожне сортування повинно мати stable unique tie-breaker.
- Query parameters проходять whitelist validation; unknown, conflicting або malformed parameters повертають узгоджений `400` response.
- API responses не повертають auth Account/Session, supplier memberships, internal status history або інші persistence-only поля.
- Catalog filters повинні виконуватися в PostgreSQL через Prisma; in-memory filtering після завантаження повного catalog не допускається.
- Integration/e2e tests працюють лише з guarded local `auto_parts_test`, створюють власні fixtures і не імпортують demo seed.

## Open questions

Ці рішення мають бути закриті в плані до реалізації підетапу, якого вони стосуються:

1. **API route/version contract - resolved for Milestone 7.1:** product API використовує versioned prefix `/api/v1`; vehicle taxonomy доступна через `/api/v1/vehicles/*`, успішні collection responses мають envelope `{ data: [...] }`, а помилки використовують standard Nest `{ statusCode, message, error }`. Existing `/api/auth/*` provider boundary не змінюється.
2. **SavedVehicle exactness and active selection - resolved for Milestone 7.2:** exact `year` зберігається в `SavedVehicle`; nullable unique `User.activeSavedVehicleId` є єдиним active pointer і має FK `ON DELETE SET NULL`. Service перевіряє generation year range та належність optional engine до generation. Повторний create однакового year/generation/engine повертає `409`, repeated select-active є idempotent, а repeated delete повертає `404`; видалення active vehicle очищає pointer.
3. **Listing condition vocabulary - resolved for Milestone 7.3:** condition належить конкретному `Listing`, а не `ProductVariant`, і використовує required enum `NEW | USED | REMANUFACTURED`. Forward migration явно backfill-ить synthetic baseline listings як `NEW`, після чого встановлює `NOT NULL` та catalog filter index; historical migrations не змінюються.
4. **Catalog result unit - resolved for Milestone 7.3:** один result і одна pagination unit представляють унікальний `Product`; response містить лише variants і `ACTIVE` listings, що відповідають усім commercial/vehicle filters. `minimumPrice` обчислюється серед matching listings у явно вибраній currency; price filters та `price_asc`/`price_desc` без currency відхиляються. Sort allowlist: `newest`, `name_asc`, `name_desc`, `price_asc`, `price_desc`, кожен із stable `Product.id` tie-breaker.
5. **Fitment truth table — resolved for Milestone 7.4:** `FitmentRule.effect` є required enum `COMPATIBLE | INCOMPATIBLE`. Exact-engine rule має precedence над generation-wide rule; за відсутності exact rule застосовується generation-wide rule. Відсутність applicable rule повертає `unknown`, а engine-specific coverage без вибраного engine — `caution`. Стабільні reason codes: `VEHICLE_NOT_SELECTED`, `EXACT_ENGINE_MATCH`, `EXACT_ENGINE_EXCLUSION`, `GENERATION_MATCH`, `GENERATION_EXCLUSION`, `ENGINE_REQUIRED`, `NO_FITMENT_DATA`.
6. **Public commercial fields — resolved for Milestone 7.4:** PDP повертає Listing `id`, `condition`, `price`, `currency`, derived `inStock` і public Supplier `{ id, name, slug }`. Exact `stockQuantity`, memberships та інші internal Supplier/auth fields не входять до public projection.

## Proposed approach

Роботу виконувати вертикальними Nest modules, з thin controllers, DTO/query validation, application services і Prisma-backed repositories/query services:

```text
HTTP request
  -> Nest controller + validated DTO/query
  -> optional SessionAuthGuard / owner resolution
  -> taxonomy, garage, catalog або fitment application service
  -> injected PrismaService
  -> PostgreSQL 16
  -> explicit response DTO + pagination/fitment metadata
```

Recommended module split:

- `VehicleTaxonomyModule` - public read queries для Year/Make/Model/Generation/Engine cascade.
- `GarageModule` - authenticated owner-only CRUD і active vehicle selection.
- `CatalogModule` - public search/filter/sort/pagination та PDP orchestration.
- `FitmentService` усередині catalog boundary - єдина pure/deterministic policy для compatibility answer; controllers не дублюють fitment logic.

Common API rules:

- IDs вхідних relations перевіряються разом із hierarchy, а не лише на існування окремого row.
- Explicit taxonomy selection і owned `savedVehicleId` нормалізуються в один internal `VehicleContext`.
- Catalog list і PDP використовують одну fitment policy, щоб однаковий vehicle/variant не отримував різні відповіді.
- Search baseline використовує case-insensitive PostgreSQL matching для Product name/description, Brand, SKU, manufacturer part number та OEM number; окремий search engine додається лише після виміряної потреби.
- Pagination response містить items і metadata; allowed sort keys документуються, а unique ID завжди є останнім tie-breaker.
- Schema changes для garage, condition або fitment semantics групуються за підетапами й ніколи не змішуються з unrelated domains.

## Milestone 7.1 - Vehicle taxonomy API

### Goal

Додати публічний read-only API для детермінованого flow `Year -> Make -> Model -> Generation -> Engine`, використовуючи canonical taxonomy Milestone 6.1 без schema changes.

### Tasks

- [x] Закрити Open question 1 і зафіксувати route naming, response DTO та shared error envelope для Milestone 7.
- [x] Створити `VehicleTaxonomyModule` із controller/service boundary; PrismaService використовувати лише через DI.
- [x] Додати endpoints для supported years, makes by year, models by year/make, generations by year/model та engines by generation.
- [x] Derive supported years з `VehicleGeneration.yearFrom/yearTo`; повертати years descending, а names/codes - у deterministic order із ID tie-breaker.
- [x] Валідувати year range, UUIDs і parent-child hierarchy; порожній валідний result повертати окремо від malformed query або nonexistent parent.
- [x] Додати unit tests для query validation/service mapping та integration/e2e tests для повного selector flow, invalid hierarchy і stable ordering.
- [x] Перевірити query count і indexes для cascade endpoints; не завантажувати всю taxonomy для кожного step.

### Definition of Done

- [x] Клієнт може пройти Year -> Make -> Model -> Generation -> Engine лише через API responses без hardcoded taxonomy.
- [x] Кожен endpoint повертає deterministic, duplicate-free result і не показує child rows поза вибраним parent/year.
- [x] Invalid year/UUID/hierarchy має стабільний `400` або `404` contract; валідний selector без matches повертає порожній list.
- [x] Public taxonomy routes не вимагають session і не повертають persistence-only fields.
- [x] Unit, integration та e2e regression проходять на `auto_parts_test` без demo seed dependency.

### Validation

```bash
pnpm --filter api lint
pnpm check-types
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter api build
git diff --check
```

### Implementation log

#### What changed

- Додано public versioned endpoints `/api/v1/vehicles/years|makes|models|generations|engines` через один `VehicleTaxonomyModule` і injected `PrismaService`.
- Додано centralized whitelist validation для year/UUID query parameters та стабільний distinction між malformed request, missing parent і valid empty result.
- Додано explicit response projections, deterministic ordering і bounded Prisma queries; existing indexes покривають make/model, model/generation year range та generation/engine lookups.
- Додано unit validation, real-database integration і Supertest e2e regression без schema changes, migrations, new dependencies або demo seed coupling.

#### Verification results

- API lint і workspace type-check - green; API build був green після фінального production TypeScript check у кроці 2.
- Unit suites: 4/4, 22 tests; integration suites: 5/5, 15 tests; e2e suites: 5/5, 21 tests.
- Taxonomy-specific regression: 5 unit validation tests, 1 integration flow і 10 e2e contract tests.
- `auto_parts_test` guard застосував усі 4 committed migrations; pending migrations немає.

## Milestone 7.2 - Customer Garage API

### Goal

Додати authenticated owner-only API для створення, читання, видалення SavedVehicle та вибору одного active vehicle, придатного для catalog/fitment context.

### Tasks

- [x] Закрити Open question 2 і задокументувати exact year, single-active invariant та delete-active behavior.
- [x] Якщо потрібно, додати мінімальні SavedVehicle fields/constraints новою forward migration; historical migrations не редагувати.
- [x] Створити `GarageModule` і endpoints для list, create, delete та select-active; userId завжди брати з validated session, а не request body/query.
- [x] На create перевіряти generation year range та належність optional EngineType до selected VehicleGeneration.
- [x] Реалізувати active selection транзакційно та захистити invariant від concurrent requests на database level.
- [x] Визначити idempotency для repeated create/select/delete requests і стабільний response DTO з повною taxonomy summary.
- [x] Додати positive і negative unit/integration/e2e tests: unauthenticated, cross-user ID, invalid engine-generation, duplicate vehicle, concurrent/single-active і delete-active cases.

### Definition of Done

- [x] Customer може створити, переглянути, видалити й активувати лише власний SavedVehicle.
- [x] SavedVehicle однозначно представляє year/generation/optional engine, а inconsistent hierarchy не записується.
- [x] Для одного User database і service layer не допускають більше одного active vehicle.
- [x] Guest отримує authentication denial, а authenticated cross-user request не розкриває чужі garage data.
- [x] Committed forward migration відтворюється в clean dev/test database, а garage regression проходить без demo seed.

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
git diff --check
```

### Implementation log

#### What changed

- Forward migration додала exact `SavedVehicle.year` та nullable unique active pointer на `User` з `ON DELETE SET NULL`; historical migrations не змінювалися.
- `GarageModule` надає authenticated owner-only list/create/delete/select-active endpoints під `/api/v1/garage/vehicles` через existing `PrismaService`.
- Create boundary whitelist-валідує body, generation year range, optional engine hierarchy та повертає `409` для duplicate vehicle.
- Explicit response DTO повертає exact selection і повну make/model/generation/engine summary без auth або persistence-only fields.
- Unit, integration та e2e regression покривають session denial, ownership isolation, hierarchy, duplicates, single-active concurrency, idempotent activation і delete-active behavior.

#### Verification results

- Schema/client/migration gate з кроку 1: Prisma validate/generate/deploy/status — green; усі 5 committed migrations застосовані до dev/test без drift.
- API lint, workspace type-check і API production build — green.
- Unit suites: 5/5, 27 tests; integration suites: 6/6, 19 tests; e2e suites: 6/6, 25 tests.
- Garage-specific regression: 5 unit validation tests, 3 service integration tests і 4 HTTP e2e tests; fixtures створюються без demo seed у guarded `auto_parts_test`.

## Milestone 7.3 - Catalog search, filters and pagination

### Goal

Додати public catalog endpoint із keyword/SKU search, погодженими commercial і taxonomy filters, deterministic sorting та bounded pagination.

### Tasks

- [x] Закрити Open questions 3-4 і зафіксувати Listing condition enum, catalog result unit, price aggregation та allowed sort keys.
- [x] Якщо condition потребує schema field/index, створити окрему reviewed forward migration і оновити synthetic fixtures без змішування з runtime workflows.
- [x] Реалізувати `CatalogModule` list endpoint із search за Product text, Brand, SKU, manufacturer part number та OEM number.
- [x] Додати filters category, brand, price range, stock availability, condition і vehicle compatibility; non-`ACTIVE` Listings завжди виключати.
- [x] Підтримати explicit taxonomy VehicleContext і owned `savedVehicleId`; conflicting contexts відхиляти, а чужий savedVehicleId не розкривати.
- [x] Реалізувати page/pageSize metadata, maximum page size 50 і explicit sort allowlist зі stable unique tie-breaker.
- [x] Уникнути duplicate catalog items через joins; total count і page items повинні використовувати однаковий normalized filter.
- [x] Додати unit tests для query normalization і integration/e2e matrix для search, combined filters, ownership, empty pages, invalid ranges, stable pagination та exclusion non-active Listings.

### Definition of Done

- [x] Catalog повертає передбачуваний paginated result для однакового dataset, filter і sort.
- [x] Keyword/SKU та category/brand/price/stock/condition filters працюють окремо й у погоджених комбінаціях.
- [x] Vehicle filter включає result як compatible лише за matching FitmentRule; unknown coverage не проходить compatible filter.
- [x] Active SavedVehicle впливає на catalog лише для owner session; explicit taxonomy selection залишається доступним Guest.
- [x] Non-active Listings не потрапляють у response, а joins не створюють duplicates або inconsistent total count.
- [x] Query validation, filter matrix і pagination regression проходять на isolated test fixtures.

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
git diff --check
```

### Implementation log

#### What changed

- `ListingCondition` (`NEW`, `USED`, `REMANUFACTURED`) додано reviewed data-preserving forward migration із required column та catalog filter index; synthetic seed залишився idempotent.
- Public `GET /api/v1/catalog/products` реалізовано через `CatalogModule`, thin controller, whitelist query pipe та injected `PrismaService`.
- Product-centric query виконує search і commercial/vehicle filters у PostgreSQL, повертає лише matching variants/`ACTIVE` listings та рахує consistent product-level `total`.
- Pagination має default `20`, maximum `50`; name/newest/price sorts мають stable Product ID tie-breaker, а minimum price не змішує currencies.
- Explicit VehicleContext залишається public; `savedVehicleId` вимагає valid Better Auth session і owner match, а cross-owner ID повертає той самий `404`, що й missing ID.

#### Verification results

- Persistence gate: Prisma validate/generate/deploy/status — green; 6 committed migrations застосовані до dev/test без drift; demo seed двічі зберіг стабільні counts.
- API lint, workspace type-check і API production build — green.
- Unit suites: 6/6, 36 tests; integration suites: 7/7, 25 tests; e2e suites: 7/7, 28 tests.
- Catalog-specific regression: 9 query validation tests, 5 integration scenarios і 3 HTTP e2e scenarios на guarded `auto_parts_test` без demo seed dependency.

## Milestone 7.4 - PDP and fitment answers

### Goal

Додати public Product Detail API та єдину fitment policy, яка пояснює compatibility для кожного relevant ProductVariant без false-positive claims.

### Tasks

- [x] Закрити Open questions 5-6 і зафіксувати exhaustive truth table для `compatible`, `incompatible`, `unknown`, `caution`, включно з reason codes та partial vehicle selection.
- [x] Якщо `incompatible` потребує explicit negative/completeness data, створити мінімальну forward migration; не виводити negative answer із простої відсутності FitmentRule.
- [x] Реалізувати PDP endpoint для Product із Brand/Category, variants, SKU/OEM/manufacturer part number та public `ACTIVE` Listings із погодженими Supplier/availability fields.
- [x] Реалізувати один `FitmentService`, який приймає normalized VehicleContext і повертає result, reason code та matched rule details без controller-specific branching.
- [x] Підтримати PDP без vehicle context, з explicit taxonomy context і з owner-only savedVehicleId/active garage context.
- [x] Відрізняти product/variant not found, unavailable public listing, invalid vehicle hierarchy та unknown fitment coverage узгодженими HTTP/domain responses.
- [x] Додати unit truth-table tests і integration/e2e tests для exact engine rule, generation-wide rule, engine mismatch, missing rule, partial selection, cross-owner saved vehicle та hidden Listings.
- [x] Перевірити Prisma query shape на bounded query count і відсутність N+1 для variants/listings/fitment details.

### Definition of Done

- [x] PDP повертає погоджений public Product/Variant/Listing projection без internal Supplier/auth fields.
- [x] Однаковий Variant і VehicleContext дають однаковий fitment result у catalog та PDP.
- [x] `compatible` завжди має matching FitmentRule; `incompatible`, `unknown` і `caution` відповідають затвердженій truth table.
- [x] Incomplete vehicle selection або fitment coverage не подається як гарантована compatibility.
- [x] PDP, reason codes, hidden listing behavior і повна fitment matrix покриті unit/integration/e2e tests.

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
git diff --check
```

### Implementation log

#### What changed

- Додано explicit `FitmentRuleEffect` baseline і forward migration з data-preserving backfill для existing positive rules.
- Додано один `FitmentService` з exact-engine precedence, stable reason codes і спільною policy для catalog filtering та PDP answers.
- Додано public `GET /api/v1/catalog/products/:productId`, normalized explicit/saved vehicle context і projection лише `ACTIVE` Listings із public Supplier fields.
- Catalog boundary структуровано за feature folders `fitment`, `product-detail` і `vehicle-context` без нового Prisma Client або окремого persistence boundary.
- Додано reusable synthetic fixtures, integration та HTTP e2e coverage для fitment matrix, hidden data, ownership і error contract.

#### Query-shape audit

- PDP завантажує Product, Brand/Category, relevant variants, `ACTIVE` Listings, Supplier projection і relevant FitmentRules одним nested Prisma query.
- No-context flow виконує 1 database query; saved-vehicle flow — 2; explicit generation/engine flow — максимум 3 bounded queries.
- Усередині mapping variants/listings немає Prisma calls, тому query count не залежить від кількості variants або listings і N+1 не виникає.

#### Verification results

- Prisma 7.9 validation/generation/deploy/status для 7 committed migrations — green; schema/migration checks виконані на попередньому кроці 7.4 і не дублювалися в regression gate.
- Unit suites: 8/8, 51 tests; integration suites: 9/9, 31 tests; e2e suites: 8/8, 32 tests.
- PDP-specific regression: 8 truth-table unit cases, 4 service integration scenarios і 4 HTTP e2e scenarios на guarded `auto_parts_test` без demo seed dependency.
- API build, targeted ESLint/Prettier і `git diff --check` — green; повторні build/lint запуски після суто test/docs змін не виконувалися.

## Milestone 7.5 - Catalog API readiness gate

### Goal

Перевірити Milestone 7 як один стабільний API contract і підготувати handoff для Cart/Checkout/Orders без додавання commerce write behavior.

### Tasks

- [ ] Відтворити `auto_parts_dev` і `auto_parts_test` лише з committed migrations; demo seed застосувати тільки до guarded development database.
- [ ] Запустити повний regression для taxonomy, garage ownership, catalog filters/pagination, PDP і fitment truth table.
- [ ] Перевірити API examples/README проти фактичних routes, DTOs, pagination metadata, error responses і fitment reason codes.
- [ ] Перевірити query plans для найбільш важких catalog/filter combinations і додати indexes лише через reviewed forward migration за виміряним evidence.
- [ ] Провести repository audit: no edited historical migrations, tracked secrets, generated artifacts, frontend changes або Milestone 8 runtime behavior.
- [ ] Оновити цей checklist та Implementation log лише після фактичної Validation.

### Definition of Done

- [ ] Усі 7.1-7.4 Tasks/DoD позначені `[x]` лише після відповідної Validation.
- [ ] Clean migration rehearsal, unit, integration та e2e suites проходять повторювано.
- [ ] API documentation відповідає фактичним routes, access rules, filters, pagination і fitment semantics.
- [ ] Catalog/PDP query behavior є deterministic, не має відомого N+1 і використовує обґрунтовані indexes.
- [ ] Немає schema drift, pending migrations, tracked secrets або змін поза погодженим backend/docs scope.
- [ ] Milestone 8 може використовувати public Listing/price/stock projections без зміни taxonomy, garage або fitment contracts.

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
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
git diff --check
```

## Migration and rollback strategy

- 7.1 не повинен змінювати schema: taxonomy вже є canonical foundation.
- 7.2 може додати лише exact-year/active-selection fields та constraints після рішення Open question 2.
- 7.3 може додати лише погоджений Listing condition/index baseline після рішення Open question 3.
- 7.4 змінює schema лише якщо затверджена fitment truth table потребує explicit negative/completeness representation.
- Кожна schema-bearing зміна отримує нову named forward migration; existing migration files залишаються immutable.
- Migration SQL переглядати до apply; destructive operations, `db push` і `migrate reset` не використовувати як deployment/rollback strategy.
- Rollback для середовища з даними - reviewed forward fix або database restore. Disposable local test database можна відтворювати лише після existing URL guard.

## Risks and mitigations

- **False compatibility claim.** Central FitmentService і exhaustive truth table; відсутність rule не перетворювати на compatible.
- **False incompatibility claim.** Не вважати відсутність positive row доказом incompatibility без explicit coverage/exclusion semantics.
- **Garage ownership leak.** User identity походить лише із session; cross-owner IDs мають negative e2e coverage і не розкривають existence чужого record.
- **Inconsistent vehicle hierarchy.** Year, make/model/generation/engine relations перевіряти як один VehicleContext до catalog query.
- **Pagination duplicates/drift.** Зафіксувати result unit, normalized filter і unique tie-breaker; перевіряти multi-page integration fixtures.
- **Public data leakage.** Використовувати explicit response DTO/select projections замість серіалізації Prisma records.
- **Slow catalog joins.** Bounded queries, no in-memory full scans, query-plan inspection та indexes лише за measured evidence.
- **Schema creep.** Кожен gap вирішувати у власному підетапі; не додавати Cart, checkout, supplier writes або status transitions.
- **Seed-coupled tests.** Integration/e2e suites створюють власні fixtures та не використовують demo seed як prerequisite.
