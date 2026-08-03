# Execution plan: Prisma, PostgreSQL і базова модель Parts/Vehicles/Fitment

## Summary

Інтегрувати Prisma ORM і PostgreSQL у NestJS API та створити першу міграцію для базових сутностей `Part`, `Vehicle` і зв'язку `Fitment`. Результат має дати API один керований спосіб доступу до бази даних, відтворювану схему та перевірений процес застосування міграцій без додавання ще не погоджених продуктових сценаріїв.

## Goal

Після завершення плану `apps/api` підключається до PostgreSQL через Prisma Client, схема Prisma описує `Part`, `Vehicle` і унікальний зв'язок `Fitment`, а чисту базу даних можна відтворити з committed-міграцій. Підключення, базові операції Prisma та обмеження моделі перевіряються автоматизованими тестами й документованими командами.

## Non-goals

- Реалізація UI або інтеграції `apps/web` з API.
- Проєктування `Listing`, `Order`, checkout, оплати, доставки чи модерації.
- Автентифікація та авторизація.
- Публічні CRUD-контролери або остаточний production API contract для Parts, Vehicles чи Fitments.
- Автоматичне визначення сумісності деталей за довільними атрибутами: `Fitment` лише зберігає явно заданий зв'язок.
- Production deployment, backup, replication, monitoring або керування секретами поза документуванням `DATABASE_URL`.
- Seed-дані, якщо вони не будуть окремо погоджені як необхідні для локальної перевірки.

## Context inspected

- `AGENTS.md` — правила репозиторію, межі та вимоги до змін persistence/schema.
- `docs/ARCHITECTURE.md` — цільовий потік NestJS -> Prisma Client -> PostgreSQL і межі застосунків.
- `docs/CONTEXT.md` — поточний стек, відсутність Prisma/PostgreSQL integration та базові поняття `Part`, `Vehicle`, `Fitment`.
- `docs/PLANS.md` — формат і вимоги до execution plan.
- `package.json` — pnpm 9, Turborepo та мінімальний Node.js `>=18`.
- `apps/api/package.json` — NestJS 11, поточні scripts/dependencies, Jest і Supertest; Prisma ще не встановлено.
- `apps/api/src/app.module.ts` — API поки має лише starter-модуль без persistence integration.
- `apps/api/src/app.controller.ts` і `apps/api/src/app.service.ts` — поточна поведінка `Hello World!`.
- `apps/api/test/app.e2e-spec.ts` — наявний e2e baseline NestJS.
- `turbo.json` — поточні root tasks не містять database або Prisma tasks.
- `.gitignore` — локальні `.env*` ігноруються; прикладу environment-файлу немає.
- `pnpm-lock.yaml` — Prisma-пакети наразі відсутні.

## Current behavior

`apps/api` є starter NestJS application: кореневий `GET /` повертає `Hello World!`. API не має database module/provider, `DATABASE_URL`, Prisma schema, generated client або міграцій. PostgreSQL для локальної розробки не визначено, а root/API scripts не містять команд для генерації Prisma Client чи застосування міграцій.

## Desired behavior

- Prisma CLI та Prisma Client додані до правильного workspace (`apps/api`) сумісними між собою версіями.
- PostgreSQL connection задається через `DATABASE_URL`; секретне значення не потрапляє до Git, а потрібний формат змінної документований у безпечному example-файлі.
- Prisma schema зберігається в межах `apps/api` і містить:
  - `Part` з ідентифікатором, мінімальними погодженими описовими полями та timestamps;
  - `Vehicle` з ідентифікатором, `make`, `model`, модельним роком і timestamps;
  - explicit join model `Fitment`, який посилається на одну деталь і один транспортний засіб;
  - database constraint, що не дозволяє дублювати ту саму пару Part/Vehicle.
- Початкова міграція створює ці таблиці, foreign keys, unique/primary constraints та погоджені indexes у чистій PostgreSQL database.
- NestJS надає один reusable Prisma provider/module; feature-код не створює окремі екземпляри `PrismaClient`.
- API коректно відкриває та закриває database connection у lifecycle застосунку.
- Automated integration test підтверджує запис і читання `Part`, `Vehicle`, `Fitment`, заборону дубліката та foreign-key behavior.
- Існуючий `GET /` і його unit/e2e tests не ламаються.
- `docs/ARCHITECTURE.md` і `docs/CONTEXT.md` оновлені після фактичної інтеграції та більше не позначають Prisma/PostgreSQL як не реалізовані.

## Constraints

- Використовувати тільки pnpm; lockfile змінюється командами pnpm, не вручну.
- Persistence належить `apps/api`; `apps/web` і `packages/ui` не імпортують Prisma Client та не працюють з базою напряму.
- Не створювати новий top-level package/app для database layer без окремого архітектурного рішення.
- Не додавати `Listing`, `Order` або непогоджені checkout/payment/shipping/compatibility правила.
- Будь-які schema changes мають бути представлені Prisma schema, committed migration і відповідним оновленням документації.
- Уже застосовані migration-файли не редагувати; наступні зміни робити новими міграціями.
- Для production-like середовищ використовувати non-interactive migration deployment (`prisma migrate deploy`), а `prisma migrate dev` залишити для локальної розробки.
- Не commit-ити реальні credentials або локальний `.env`; example-файл повинен містити лише placeholder/local-safe value.
- Цільова ORM version — Prisma 7.x. Prisma CLI, Prisma Client і PostgreSQL driver adapter мають бути зафіксовані на однаковій exact version `7.9.0`; version ranges (`^`/`~`) для цих пакетів не використовувати.
- Мінімальний Node.js engine для локального середовища та CI — `>=22.12.0 <23`; рекомендований локальний runtime — актуальний patch-реліз Node.js 22 LTS. Root `package.json` має бути оновлений з `>=18` до цього діапазону до встановлення Prisma 7. Перехід на Prisma 7 також має врахувати його ESM configuration і обов'язковий PostgreSQL driver adapter, не змінюючи версії Next.js, NestJS чи інших технологій стеку.
- Основний dev/test database baseline — локальний PostgreSQL 16 у repo-managed Docker Compose. Development і test використовують різні бази (`auto_parts_dev` та `auto_parts_test`) на одному локальному server і окремі `DATABASE_URL`. Supabase або інший managed PostgreSQL можна оцінити пізніше для deployment, але не використовувати як baseline для development чи tests.
- Integration tests повинні працювати лише з `auto_parts_test`, перевіряти суфікс `_test` перед cleanup/reset і не очищати development або production database.
- Destructive reset/drop дозволений лише для явно перевіреної test/local database, ніколи для довільного `DATABASE_URL`.
- Старт API при недоступній базі має завершуватися передбачуваною помилкою без витоку connection string.

## Open questions

None. Для Milestone 0 прийняті такі рішення:

1. **Локальний PostgreSQL:** використовувати repo-managed Docker Compose, щоб development і integration/e2e tests відтворювалися однаково на локальній машині. Один PostgreSQL server містить окремі бази `auto_parts_dev` і `auto_parts_test`; для них використовуються різні `DATABASE_URL`. Зовнішня PostgreSQL instance може бути підключена вручну, але не є baseline і не змінює committed migrations.
2. **PostgreSQL version:** підтримуваний baseline — PostgreSQL 16 для development, tests і першого deployment. Compose image фіксується на major tag `postgres:16`; перехід на іншу major version потребує окремої перевірки migrations та integration tests.
3. **Identifiers:** `Part.id` і `Vehicle.id` — application-generated UUID v4, які Prisma зберігає в native PostgreSQL `uuid` (`String @id @default(uuid()) @db.Uuid`). `Fitment` не має окремого surrogate id: composite primary key складається з `(partId, vehicleId)`.
4. **Мінімальні поля Part:** обов'язкові `name`, `manufacturer` і `manufacturerPartNumber`, а також `createdAt`/`updatedAt`. Номер задається виробником і не вважається глобально унікальним; database constraint — `unique(manufacturer, manufacturerPartNumber)`. Перед записом application layer обрізає зовнішні пробіли та приводить `manufacturerPartNumber` до uppercase, щоб уникати очевидних дублікатів.
5. **Vehicle uniqueness:** у базовій моделі обов'язкові лише `make`, `model`, `year` та timestamps; `trim`/`engine` не додаються в цьому milestone. `unique(make, model, year)` визначає одну канонічну модель для конкретного модельного року. Application layer обрізає зовнішні пробіли й використовує узгоджене написання `make`/`model` перед записом.
6. **Значення year:** `year` — один модельний рік як integer на одному `Vehicle`. Діапазон років не зберігається; сумісність у кількох роках представлена окремими `Vehicle` та `Fitment` records.
7. **Delete policy:** foreign keys `Fitment.partId` і `Fitment.vehicleId` використовують `onDelete: Cascade` та `onUpdate: Cascade`, бо `Fitment` не має самостійного життєвого циклу. Видалення `Part` або `Vehicle` видаляє лише залежні join rows, не іншу сторону зв'язку.
8. **Public API:** CRUD endpoints не входять у цю реалізацію. Persistence boundary перевіряється через injected NestJS service/Prisma provider та integration tests; public controllers і DTO додаються окремим планом після погодження API contract.

## Proposed approach

Розмістити Prisma schema, migrations і generated-client configuration у `apps/api`, оскільки NestJS API володіє persistence orchestration. Додати глобальний або явно імпортований `PrismaModule` з одним `PrismaService`, який розширює/обгортає `PrismaClient` та інтегрується з NestJS lifecycle. Domain services надалі отримуватимуть цей provider через dependency injection; контролери не повинні звертатися до Prisma напряму.

Погоджена базова модель:

```text
Part 1 ----- * Fitment * ----- 1 Vehicle

Part
  id: UUID primary key
  name: required
  manufacturer: required
  manufacturerPartNumber: required
  createdAt: required
  updatedAt: required
  unique(manufacturer, manufacturerPartNumber)

Vehicle
  id: UUID primary key
  make: required
  model: required
  year: required integer model year
  createdAt: required
  updatedAt: required
  unique(make, model, year)

Fitment
  partId: UUID -> Part.id, onDelete/onUpdate Cascade
  vehicleId: UUID -> Vehicle.id, onDelete/onUpdate Cascade
  createdAt: required
  primaryKey(partId, vehicleId)
  index(vehicleId)
```

`Fitment` має бути explicit join model, а не implicit many-to-many relation: composite primary key забороняє дублікати, окремий index на `vehicleId` підтримує пошук деталей за транспортним засобом, а `createdAt` залишає audit baseline. Узгоджені fitment metadata можна додати пізніше окремою міграцією; не додавати їх наперед.

Очікуваний runtime flow для майбутніх domain operations:

```text
API request
  -> NestJS controller/validation
  -> domain service
  -> injected PrismaService
  -> PostgreSQL
  -> mapped response
```

### Milestone 0 — погодити database і schema decisions

- [x] Зафіксувати відповіді на open questions 1–8 у цьому документі.
- [x] Зафіксувати Prisma `7.9.0` і Node.js engine `>=22.12.0 <23`, сумісні з поточними NestJS 11 і TypeScript.
- [x] Зафіксувати остаточні поля, nullability, identifiers, indexes і referential actions для трьох моделей.
- [x] Узгодити repo-managed Docker Compose з окремою `auto_parts_test` для integration/e2e tests.

Validation:

- У `Open questions` немає невирішених пунктів, що змінюють migration schema або test environment.
- Остаточна модель може бути однозначно перенесена в Prisma schema без додаткових продуктових припущень.

### Milestone 1 — підготувати PostgreSQL і Prisma toolchain

- [ ] Додати Prisma CLI як dev dependency та Prisma Client як runtime dependency до `apps/api` через pnpm.
- [ ] Додати Prisma schema з PostgreSQL datasource і client generator у `apps/api/prisma/schema.prisma` (або зафіксувати інший шлях у package configuration).
- [ ] Додати API scripts для generate, migration development, migration deployment і schema validation; root aliases додавати лише якщо вони справді потрібні monorepo workflow.
- [ ] Додати безпечний environment example із форматом `DATABASE_URL` та короткі інструкції запуску обраного PostgreSQL baseline.
- [ ] Якщо погоджено repo-managed Compose, додати мінімальний PostgreSQL service з named volume і healthcheck без production credentials.

Validation:

- `pnpm --filter api exec prisma validate` проходить із test/local `DATABASE_URL`.
- `pnpm --filter api exec prisma generate` створює client без ручних змін generated files.
- З чистого checkout інший contributor може підняти/підключити PostgreSQL за документацією без отримання секретів із Git.

### Milestone 2 — створити модель і початкову міграцію

- [ ] Описати погоджені `Part`, `Vehicle`, `Fitment`, relations, indexes та referential actions у Prisma schema.
- [ ] Створити і переглянути initial migration SQL; переконатися, що вона не містить випадкових destructive operations.
- [ ] Застосувати committed migrations до чистої development/test database.
- [ ] Перевірити, що повторний `migrate deploy` є idempotent і не створює schema drift.

Validation:

- `prisma migrate status` показує актуальну schema без pending migrations після deployment.
- Чиста PostgreSQL database відтворюється лише з committed migrations.
- PostgreSQL відхиляє duplicate `Fitment(partId, vehicleId)` і записи з неіснуючими foreign keys.
- Перевірений delete behavior відповідає рішенню з Milestone 0.

### Milestone 3 — інтегрувати Prisma з NestJS lifecycle

- [ ] Додати `PrismaModule`/`PrismaService` у межах `apps/api/src` і підключити його до `AppModule`.
- [ ] Забезпечити єдиний injectable client і коректне завершення connection pool під час shutdown.
- [ ] Не додавати public domain endpoints; за потреби створити мінімальний internal service тільки для перевірки dependency injection і persistence boundary.
- [ ] Додати unit tests для lifecycle/provider behavior там, де вони дають стабільну перевірку без реальної бази.

Validation:

- `pnpm --filter api build` і backend type-check проходять.
- NestJS application стартує з валідною database configuration та передбачувано завершується при shutdown.
- Пошук у `apps/api/src` не знаходить неконтрольованих `new PrismaClient()` поза затвердженим provider.
- Існуючі unit tests для `GET /` залишаються зеленими.

### Milestone 4 — додати database integration tests

- [ ] Налаштувати окремий test `DATABASE_URL` з явним guard проти production/development database.
- [ ] Перед test suite застосовувати committed migrations до ізольованої бази; cleanup виконувати транзакційно або в межах перевіреної test schema/database.
- [ ] Додати integration test для створення й читання Part, Vehicle та Fitment через injected Prisma boundary/service.
- [ ] Додати regression checks для duplicate fitment, foreign keys і погодженої delete policy.
- [ ] Зберегти наявний Supertest e2e test або адаптувати bootstrap так, щоб database lifecycle не робив його flaky.

Validation:

- `pnpm --filter api test` проходить.
- `pnpm --filter api test:e2e` проходить із ізольованою PostgreSQL test database.
- Повторний запуск suite дає той самий результат і не залежить від залишкових записів.
- Тести не можуть підключитися до database, що не має явного test marker/name, визначеного в Milestone 0.

### Milestone 5 — документація та повна перевірка

- [ ] Оновити `docs/CONTEXT.md`: позначити фактичні Prisma/PostgreSQL versions, model baseline, migration/test commands і прибрати застаріле `not configured`.
- [ ] Оновити `docs/ARCHITECTURE.md`: описати реалізований persistence boundary, не видаючи non-goals за готові можливості.
- [ ] Оновити релевантний API/root README короткими setup і migration commands.
- [ ] Перевірити, що реальні credentials, local database data та generated artifacts не потрапили до Git.
- [ ] Оновити статуси цього execution plan лише після фактичної перевірки кожного milestone.

Validation:

- `pnpm lint` проходить без незапланованих auto-fixes.
- `pnpm check-types` проходить.
- `pnpm build` проходить.
- Backend unit, integration та e2e tests проходять із чистою test database.
- `git diff --check` не показує whitespace errors.
- Документація та manifests узгоджені з фактичними версіями, paths і scripts.

### Migration and rollback strategy

- Початкова migration є additive: вона створює нові таблиці та constraints, оскільки persistence layer зараз відсутній.
- До merge перевірити migration SQL вручну та застосувати його до чистої disposable database.
- У shared/production-like environments виконувати forward-only rollout через `prisma migrate deploy`.
- Якщо migration не була застосована поза disposable local/test database, її можна виправити й перегенерувати до review. Після застосування у shared environment migration-файл не редагувати; виправлення робити новою forward migration.
- Rollback для ще не використовуваної бази полягає у видаленні disposable database/container volume лише після перевірки target. Для середовища з даними rollback має бути окремою reviewed migration/restore procedure; автоматичний `migrate reset` заборонений.

### Risks and mitigations

- **Невизначена domain semantics.** Перед schema implementation закрити Milestone 0; не перетворювати припущення про part numbers, vehicle uniqueness або fitment ranges на constraints.
- **Несумісність Prisma з Node.js baseline.** Перевірити version matrix до встановлення; не піднімати root engine приховано в database change.
- **Випадкове використання неправильної бази тестами.** Використати окремий test connection, явний environment guard і validated target перед cleanup/reset.
- **Schema drift або відредаговані migration files.** Відтворювати чисту базу з committed migrations і перевіряти `migrate status` у validation workflow.
- **Connection leaks у watch/tests.** Один Nest-managed Prisma provider, lifecycle hooks та явне закриття test application.
- **Занадто широке persistence API.** Prisma залишається в `apps/api`; web/shared UI не залежать від generated client.
- **Нестабільні tests через shared state.** Ізольована database/schema на suite або worker, deterministic setup і cleanup.
- **Витік credentials.** Commit лише example configuration; реальні `.env*` залишаються ignored і не виводяться в logs/errors.
