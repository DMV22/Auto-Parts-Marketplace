# Execution plan: Cart, Checkout and Orders API

## Summary

Реалізувати Milestone 8 як безпечний backend commerce lifecycle поверх завершених domain/auth/RBAC і fitment-aware catalog foundations. API має підтримувати owner-isolated guest/customer cart, серверне створення pending Order, Stripe Checkout Session, signature-verified idempotent webhook processing та owner-only order history/detail/timeline.

Milestone розбито на підетапи 8.1-8.5. Кожен підетап має окрему persistence/runtime boundary і regression coverage. Stripe redirect є лише зовнішнім UI-кроком: authoritative payment і Order transitions відбуваються виключно після валідного webhook.

## Goal

Після завершення плану Guest або authenticated Customer може сформувати власний Cart, перейти до server-created Stripe Checkout і отримати pending Order до redirect. Сервер повторно перевіряє Listing, stock і price, зберігає immutable OrderItem snapshots, а валідний Stripe webhook ідемпотентно та атомарно оновлює payment/order state. Власник може прочитати лише власні Orders і status timeline; client success redirect не має write-доступу до payment state.

## Non-goals

- Frontend cart, checkout, success/cancel pages або Stripe Elements UI.
- Supplier Cabinet, listing moderation, payouts або supplier settlement.
- Shipping rates, labels, carriers, fulfillment, warehouses або delivery tracking.
- Returns, refunds, disputes, chargebacks або CRM/OMS behavior.
- Coupons, promotions, taxes, gift cards, subscriptions або multi-party marketplace payments.
- Stripe Connect, destination charges або automatic supplier payouts.
- Anonymous order recovery через email, magic link або support workflow.
- Redis cart/session storage, message broker, background job platform або production deployment.
- Зміни vehicle taxonomy, garage, catalog search, PDP, fitment policy або Better Auth provider boundary.

## Context inspected

- `docs/BACKEND-PLAN.md` - завершені domain/auth/RBAC/status decisions, migration rules і Milestone 8 handoff.
- `docs/CATALOG-API-PLAN.md` - execution-plan structure, public Listing contract, test isolation і readiness-gate format.
- `docs/PLANS.md` - execution-plan requirements і checklist statuses `[ ]`, `[~]`, `[x]`, `[!]`.
- `docs/CONTEXT.md` - фактичний Node/Nest/Prisma/PostgreSQL stack, local database workflow і validation commands.
- `docs/ARCHITECTURE.md` - єдиний Nest `PrismaModule`/`PrismaService`, Better Auth/RBAC boundary і current commerce non-goals.
- `apps/api/prisma/schema.prisma` - existing `Listing`, `Order`, `OrderItem`, `PaymentEvent`, status enums, User ownership і supplier relations.
- `apps/api/src/auth` - session resolution, roles і ownership patterns, які не можна обходити client-provided identity.
- `apps/api/src/catalog` - public `ACTIVE` Listing/price/stock projections, DTO validation і current `/api/v1` convention.
- `apps/api/test` - guarded `auto_parts_test`, committed-migration setup і fixture-owned unit/integration/e2e regression.
- `apps/api/package.json`, `apps/api/.env.example`, `apps/api/prisma.config.ts` - actual scripts, dependencies, environment examples і Prisma 7 configuration.

## Current behavior

Milestones 6-7 вже надають:

- session-based Better Auth, persisted Customer identity, RBAC і owner-scoped data access;
- public catalog/PDP із `ACTIVE` Listings, server-projected price, currency та derived stock availability;
- existing `Order` і `OrderItem` records зі `PENDING_PAYMENT` default та immutable-looking `unitPrice` field;
- append-oriented `PaymentEvent` із unique `externalEventId` і processing status;
- agreed `OrderStatus`: `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`;
- guarded `auto_parts_test`, committed migrations і independent fixtures.

Поточні gaps для Milestone 8:

- немає `Cart`/`CartItem`, guest commerce identity або cart ownership contract;
- `Order.customerId` required, тому guest Order зараз неможливий;
- немає checkout request/session identity, reservation expiry або persisted Order status timeline;
- Stripe SDK/configuration, server checkout gateway і raw-body webhook boundary відсутні;
- немає runtime transitions для `Order`/`PaymentEvent` і захисту від повторного webhook;
- немає owner-only order history/detail/timeline API.

## Desired behavior

- Один normalized `CommerceActor` представляє або authenticated Customer, або opaque guest context; client ніколи не передає trusted `customerId` чи guest ownership hash.
- Cart items посилаються на Listing, а сервер на кожному write і перед checkout перевіряє `ACTIVE` status, positive stock, quantity та актуальну Listing price/currency.
- Client не надсилає authoritative price. `OrderItem.unitPrice` і Stripe line items формуються лише зі snapshot, створеного сервером.
- Pending Order і початковий timeline record створюються до Stripe redirect; checkout retry не створює дублікати при повторенні того самого idempotency key.
- Stripe Checkout Session створюється лише server-side, містить internal `orderId` metadata і повертає клієнту тільки погоджені redirect/session fields.
- Webhook читає raw request body, перевіряє Stripe signature до будь-якого DB mutation і обробляє лише allowlisted event types.
- Unique `PaymentEvent.externalEventId` робить повторну доставку безпечною: один event не створює повторні transitions, timeline entries або stock adjustments.
- `PAID` встановлюється лише webhook handler після підтвердженого paid state; success redirect/read endpoint ніколи не змінює Order.
- Order history, detail і timeline мають bounded pagination, explicit response projections та customer/guest ownership isolation.
- Unit, integration та e2e tests працюють лише з guarded `auto_parts_test`, створюють власні fixtures, mock/fake Stripe boundary і не залежать від demo seed або live Stripe.

## Constraints

- Реалізація належить лише `apps/api`; frontend, shared UI packages і Milestones 9-10 не змінювати.
- Використовувати поточні Node.js `>=22.12.0 <23`, NestJS 11, Prisma `7.9.0`, PostgreSQL 16 і pnpm.
- Зберегти один Nest `PrismaModule`/`PrismaService`; не створювати `PrismaClient` у commerce controllers/services або Stripe adapter.
- Використовувати existing `Order`, `OrderItem`, `PaymentEvent`, `ListingStatus`, `OrderStatus` і auth/RBAC foundation; розширювати їх лише мінімальними forward-only schema changes.
- Historical migrations immutable. Кожну schema change створювати named forward migration, переглядати SQL і перевіряти через clean `migrate deploy`; `db push` не використовувати.
- Guest не стає persisted RBAC role. Guest ownership походить лише з server-issued high-entropy context; raw token не логувати й не зберігати у відкритому вигляді.
- Cart і Order доступні лише authenticated `customerId` або відповідному guest context. Cross-owner і missing resource повинні мати однаковий non-disclosing response.
- Client-supplied Listing price, total, currency, customerId, Order status, payment status або Stripe event payload не є trusted data.
- Checkout приймає лише `ACTIVE` Listings, positive requested quantity, достатній stock і одну погоджену currency; усі values повторно читаються в checkout transaction.
- Не тримати database transaction відкритою під час Stripe network call. Stripe failure після reservation/order creation потребує explicit compensating transition.
- Pending Order існує до redirect. Ні success URL, ні cancel URL, ні client polling не можуть встановити `PAID`.
- Webhook endpoint не використовує session auth, але вимагає Stripe signature verification над exact raw body до JSON-dependent processing.
- Webhook mutations мають бути transactional та idempotent. Duplicate `externalEventId` повертає успішне acknowledgement без повторної domain mutation.
- Payment/event payload не повертати customer API і не логувати разом із secrets, signature або sensitive checkout data.
- Stripe secret key, webhook secret і redirect URLs надходять лише з environment; `.env.example` містить placeholders, реальні значення не commit-ити.
- Integration/e2e suites використовують guarded `TEST_DATABASE_URL`/`auto_parts_test`, власні fixtures і fake Stripe gateway; live network/Stripe credentials для test gate не потрібні.

## Open questions

Ці рішення materially впливають на schema або lifecycle. Їх треба закрити до реалізації вказаного підетапу; нижче наведено рекомендований baseline для grilling/review.

1. **Guest ownership token - resolved for 8.1.** Сервер видає opaque 256-bit token у `HttpOnly`, `SameSite=Lax`, `Path=/`, production `Secure` cookie; PostgreSQL зберігає лише deterministic SHA-256 hash. Cookie і guest Cart мають sliding TTL 30 днів після cart mutation; expired context не відновлюється, а background cleanup не входить у 8.1. `Cart` і майбутній guest `Order` мають XOR ownership: або `customerId`, або `guestTokenHash`, але не обидва.
2. **Guest-to-customer cart merge - resolved for 8.1.** Automatic merge не виконується. Valid Customer session має precedence над guest cookie; під час першого authenticated `/api/v1/cart*` request старий guest cookie очищається. Customer cart не отримує guest items, а abandoned guest row залишається ізольованим до expiry; merge потребуватиме окремої transactional policy в майбутньому.
3. **Cart currency and cardinality - resolved for 8.1.** Один owner context має максимум один Cart. Cart створюється lazy під час першого item write; `GET` для відсутнього Cart повертає empty DTO без DB row. Перший Listing фіксує currency, інша currency повертає `409`, а видалення останнього item очищає currency. Price/currency/totals визначає лише сервер із current Listing.
4. **Stock reservation and expiry - resolve before 8.2.** Рекомендовано reserved-stock baseline: checkout transaction атомарно перевіряє/decrements `Listing.stockQuantity`, створює `PENDING_PAYMENT` Order і задає `checkoutExpiresAt` (baseline 30 minutes). `checkout.session.expired` або compensating failure переводить pending Order у `CANCELLED` і повертає stock рівно один раз.
5. **Checkout request idempotency - resolve before 8.2.** Рекомендовано required high-entropy `Idempotency-Key` для create-checkout, persisted як unique `checkoutRequestId`; повтор owner/key повертає existing checkout result або current Order state, а інший payload під тим самим key повертає `409`.
6. **Stripe event allowlist - resolve before 8.3.** Рекомендований baseline: `checkout.session.completed` встановлює `PAID` лише якщо Stripe `payment_status=paid`; `checkout.session.async_payment_succeeded` також підтверджує payment; `checkout.session.async_payment_failed` і `checkout.session.expired` cancel-ять лише still-pending Order та release-ять reservation. Unrelated valid events acknowledge-яться без domain mutation.
7. **Order timeline source - resolve before 8.2/8.4.** Рекомендовано append-only `OrderStatusEvent` із `fromStatus`, `toStatus`, source, timestamp і optional `paymentEventId`; initial `PENDING_PAYMENT` запис створюється разом з Order, а webhook transition і timeline insert відбуваються в одній transaction.

## Proposed approach

Реалізацію виконувати вертикальними Nest boundaries з thin controllers, whitelist validation, owner-aware application services, Prisma transactions та окремим Stripe port/adapter:

```text
Guest cookie or Better Auth session
  -> CommerceActorResolver
  -> CartController / CheckoutController / OrdersController
  -> validated command/query
  -> CartService / CheckoutService / OrdersService
  -> injected PrismaService
  -> PostgreSQL 16

CheckoutService
  -> transaction: re-read Listings + validate + reserve + create pending Order/snapshots
  -> StripeCheckoutGateway: create Checkout Session outside DB transaction
  -> persist Stripe session identity or compensate safely
  -> redirect/session response

Stripe raw webhook
  -> StripeWebhookController
  -> signature verification in Stripe gateway
  -> WebhookService transaction
  -> unique PaymentEvent + conditional Order transition + timeline + optional stock release
  -> 2xx acknowledgement
```

Recommended module split:

- `CommerceModule` - composition boundary for common actor, ownership and Stripe providers; no parallel Prisma client.
- `CartModule` - guest/customer Cart CRUD, live Listing validation and response mapping.
- `CheckoutModule` - cart-to-order orchestration, immutable snapshots, reservation and server-only Stripe Session creation.
- `PaymentsModule` - raw Stripe webhook, signature validation, event idempotency and payment-driven transitions.
- `OrdersModule` - owner-only history, detail and append-only status timeline reads.

Recommended API baseline:

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:itemId`
- `DELETE /api/v1/cart/items/:itemId`
- `DELETE /api/v1/cart`
- `POST /api/v1/checkout/session`
- `POST /api/v1/webhooks/stripe`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:orderId`
- `GET /api/v1/orders/:orderId/timeline`

Common commerce rules:

- Actor resolution є server-side: valid Customer session має precedence; інакше використовується issued guest context.
- Cart response може показувати live price/availability, але checkout завжди повторно читає Listing у transaction; Cart не є price guarantee.
- Order/OrderItem є immutable commercial snapshot після створення, окрім controlled status/session metadata transitions.
- Stripe adapter приховує SDK types від application services; tests підміняють port deterministic fake без network calls.
- State transition виконується conditional update із перевіркою expected current status. Terminal/repeated event не повторює side effects.
- HTTP responses використовують explicit DTO projections; internal token hashes, exact stock, PaymentEvent payload, Stripe secrets та provider metadata не виходять назовні.

## Milestone 8.1 - Owner-isolated Cart API

### Goal

Додати persistence та API для одного owner-isolated guest/customer Cart із live server-side validation Listing, quantity, stock, price і currency без checkout або payment behavior.

### Tasks

- [x] Закрити Open questions 1-3: guest token storage/cookie policy, sign-in merge behavior, one-cart/one-currency invariants і expiry policy.
- [x] Додати `Cart` і `CartItem` новою reviewed forward migration; зафіксувати XOR customer/guest ownership, unique owner cart, unique `(cartId, listingId)`, positive quantity, timestamps, optional expiry та referential actions.
- [x] Додати server-only guest context issuer/resolver і normalized `CommerceActor`; не перетворювати Guest на persisted role та не приймати owner identity з body/query.
- [x] Реалізувати `CartModule` і owner-only get/add/update/remove/clear endpoints під `/api/v1/cart` через existing `PrismaService`.
- [x] На кожному write перевіряти Listing existence, `ACTIVE` status, positive stock, requested quantity, live price/currency і cart currency invariant; client price/total ігнорувати або відхиляти як unknown fields.
- [x] Повертати explicit Cart DTO з items, current unit price, line total, currency, availability issues і server-computed totals; exact internal stock та guest token hash не повертати.
- [x] Визначити idempotency/error contract: same Listing додається як controlled quantity update, malformed quantity повертає `400`, inactive/missing Listing - non-disclosing `404`, insufficient stock/currency conflict - `409`.
- [x] Додати unit tests для validation/actor policy та integration/e2e coverage для guest/customer isolation, cross-owner IDs, duplicate listing, inactive listing, stock, price refresh, currency і clear behavior.

### Definition of Done

- [x] Guest і Customer можуть керувати лише Cart свого server-resolved context; client не може підмінити owner ID/token hash.
- [x] Один Cart не містить duplicate Listing rows, non-positive quantities, mixed currencies або item quantity понад підтверджений current stock після успішного write.
- [x] Non-`ACTIVE`, missing або out-of-stock Listing не може бути успішно доданий чи збільшений.
- [x] Cart total обчислюється із current server-side Listing prices; client-supplied price не впливає на persistence або response.
- [x] Guest raw token не зберігається/логується відкрито, а cross-owner requests не розкривають existence resource.
- [x] Forward migration і Cart regression відтворюються на guarded `auto_parts_test` без demo seed або Stripe credentials.

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

- Додано owner-isolated `CartModule` з API для читання, додавання, заміни quantity, видалення item і очищення cart.
- Guest context використовує opaque cookie та SHA-256 hash у БД; authenticated Customer має пріоритет без автоматичного merge guest cart.
- Cart writes перевіряють актуальні `Listing.status`, stock, price/currency та виконуються через existing `PrismaService`; response totals обчислюються сервером.
- Додано unit, integration та e2e regression coverage для ownership, concurrency, expiry, constraints, commercial-state conflicts і cookie lifecycle.
- Validation пройдено: Prisma schema/migrations без pending changes або drift; unit `11/11` suites (`63` tests), integration `10/10` suites (`41` tests), e2e `9/9` suites (`35` tests); repository lint, type-check і build завершилися успішно.

## Milestone 8.2 - Pending Order and server checkout orchestration

### Goal

Перетворити валідний owner Cart на immutable `PENDING_PAYMENT` Order до Stripe redirect, із transactional price/stock revalidation, idempotent checkout request і контрольованою reservation/compensation policy.

### Tasks

- [x] Закрити Open questions 4-5 і timeline частину Open question 7: reservation timing/expiry, stock release, checkout idempotency та initial status event.
- [x] Новою reviewed forward migration зробити `Order.customerId` nullable для guest ownership, додати guest owner hash/XOR constraint, `checkoutRequestId`, checkout expiry/session fields та мінімальний `OrderStatusEvent` baseline.
- [x] Розширити `OrderItem` immutable display snapshots, потрібні для order history без залежності від майбутнього редагування Product/Listing/Supplier; зберегти authoritative `unitPrice`, quantity і Listing reference.
- [x] Додати official Stripe server SDK лише до `apps/api`, env-only `STRIPE_SECRET_KEY`, redirect URLs і injectable `StripeCheckoutGateway`; application tests використовують fake gateway.
- [x] Реалізувати `POST /api/v1/checkout/session`: resolve owner, whitelist validate request/idempotency key, повторно прочитати Cart/Listings і відхилити empty/stale/inactive/mixed-currency/insufficient-stock checkout.
- [x] У короткій serializable transaction атомарно reserve stock, створити pending Order, OrderItems із server price snapshots, initial timeline entry та зв'язати checkout request; не викликати Stripe всередині transaction.
- [x] Після commit створити Stripe Checkout Session server-side з Order metadata та snapshot line items, потім persist provider session ID; при Stripe failure виконати idempotent compensating cancellation/release.
- [x] Зробити repeated same owner/idempotency-key безпечним, не створювати другий Order/reservation/Stripe Session; different request під тим самим key повертати `409`.
- [x] Додати unit/integration/e2e tests для pending-before-redirect, server pricing, snapshot immutability, stale cart, concurrent stock, retry/idempotency, guest/customer ownership і Stripe-gateway failure compensation.

### Definition of Done

- [x] Pending Order, items, reservation і initial timeline існують до повернення Stripe redirect/session response.
- [x] Stripe line items і Order total походять лише з server-revalidated Listing snapshots; Cart/client total не є authoritative.
- [x] Concurrent checkout не може успішно зарезервувати більше stock, ніж доступно, або створити negative `Listing.stockQuantity`.
- [x] Повторний checkout із тим самим idempotency key не створює duplicate Order, items, reservation або provider session.
- [x] Stripe API failure не залишає невідновлювану reservation: Order переходить у погоджений terminal state і stock повертається рівно один раз.
- [x] Success/cancel URL є redirect-only data і не містить способу змінити Order/Payment state.

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

- Додано reviewed forward migration для guest/customer Order ownership, checkout request/session state, immutable `OrderItem` snapshots і append-only `OrderStatusEvent` baseline.
- Реалізовано `CheckoutModule` та `POST /api/v1/checkout/session` з required UUID v4 `Idempotency-Key`, empty-body whitelist і server-only Cart/Listing validation.
- `CheckoutService` у serializable transaction резервує stock і створює `PENDING_PAYMENT` Order до зовнішнього виклику; 30-хвилинна expiry policy має 1-хвилинний provider safety buffer, а Stripe SDK доступний лише через injectable `CheckoutGateway`.
- Provider failure ідемпотентно переводить Order у `CANCELLED`, повертає stock рівно один раз і додає SYSTEM timeline event; same-key retries сходяться на одному Order/Session.
- Validation пройдено: Prisma має `9` applied migrations без pending changes або drift; unit `13/13` suites (`78` tests), integration `11/11` suites (`51` tests), e2e `10/10` suites (`38` tests); API lint/build і repository type-check завершилися успішно.

## Milestone 8.3 - Signature-verified Stripe webhook and idempotent payment transitions

### Goal

Додати єдиний authoritative payment boundary: Stripe webhook перевіряє signature над raw body і атомарно/ідемпотентно записує PaymentEvent, Order transition, timeline та reservation side effects.

### Tasks

- [ ] Закрити Open question 6 і webhook частину Open question 7: supported event types, Stripe field mapping, terminal/retry behavior і timeline source.
- [ ] Додати `STRIPE_WEBHOOK_SECRET` placeholder до `.env.example` і startup validation без логування secret values.
- [ ] Налаштувати raw request body лише для Stripe webhook boundary так, щоб signature verification отримувала exact bytes і не ламала existing JSON/Auth routes.
- [ ] Реалізувати public `POST /api/v1/webhooks/stripe`; signature перевіряти до parse-dependent domain lookup або будь-якого Prisma write.
- [ ] Allowlist-ити погоджені checkout events, перевіряти provider object/metadata/order/session/currency/amount consistency та відхиляти spoofed або mismatched payload.
- [ ] У Prisma transaction вставляти `PaymentEvent` із unique `externalEventId`, виконувати conditional allowed Order transition, append timeline і release stock лише для first valid terminal pending-order event.
- [ ] Duplicate `externalEventId` acknowledge-ити `2xx` без duplicate row, status transition, timeline entry або stock mutation; unexpected processing failure повертати retryable non-2xx.
- [ ] Встановлювати `PAID` лише для валідного paid webhook state. `checkout.session.completed` без paid confirmation не повинен автоматично означати `PAID`.
- [ ] Додати unit/integration/e2e tests для invalid/missing signature, raw-body verification, valid paid event, async success/failure, expiry, duplicate delivery, out-of-order/terminal events, metadata/amount mismatch і success redirect no-op.

### Definition of Done

- [ ] Invalid або missing Stripe signature не створює PaymentEvent і не змінює Order, timeline чи stock.
- [ ] Валідний supported webhook атомарно створює рівно один PaymentEvent і погоджений Order/timeline transition.
- [ ] `PaymentEvent.externalEventId` гарантує, що repeated webhook безпечно ігнорується без duplicate side effects.
- [ ] Лише webhook-confirmed paid state переводить Order у `PAID`; browser redirect, polling і checkout-session creation цього не роблять.
- [ ] Expired/failed pending checkout release-ить reservation рівно один раз; already paid/terminal Order не регресує від late event.
- [ ] Tests не використовують live Stripe network або real secrets і проходять на isolated fixtures.

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

## Milestone 8.4 - Owner-only Order history, detail and timeline API

### Goal

Надати Customer/guest context read-only API для власної order history, immutable order detail та machine-readable status timeline без витоку payment payload або чужих commerce data.

### Tasks

- [ ] Закрити presentation частину Open question 7: timeline DTO, public source/reason vocabulary і pagination contract.
- [ ] Реалізувати `OrdersModule` із `GET /api/v1/orders`, `GET /api/v1/orders/:orderId` та `GET /api/v1/orders/:orderId/timeline` через normalized `CommerceActor` і existing `PrismaService`.
- [ ] Додати bounded pagination (default `20`, maximum `50`) і deterministic `createdAt desc, id desc` ordering для history/timeline.
- [ ] Owner scope застосовувати в Prisma query (`customerId` або guest hash), а не після завантаження; cross-owner і missing Order повертати однаковий `404`.
- [ ] Повертати explicit DTO: Order number/ID, status, currency, total, timestamps, immutable item snapshots і public current Listing/Product references лише там, де вони не змінюють historical meaning.
- [ ] Timeline повертати ordered public status events без raw PaymentEvent payload, Stripe signature/provider secrets, guest hash або internal failure details.
- [ ] Підтвердити, що history/detail/timeline endpoints read-only: success page може polling-ити current state, але не може виконати transition.
- [ ] Додати unit/integration/e2e tests для customer/guest history, pagination, detail, timeline ordering, pending/paid/expired cases, cross-owner isolation і internal-field projection.

### Definition of Done

- [ ] Authenticated Customer і guest context бачать лише власні Orders; зміна route UUID не розкриває чужий Order.
- [ ] History і timeline мають bounded deterministic pagination без duplicates або unstable page boundaries.
- [ ] Order detail зберігає historical item names/SKU/supplier/price/quantity навіть після future catalog/listing changes.
- [ ] PaymentEvent payload, external secrets, raw guest identifiers та internal membership data не входять у public responses.
- [ ] Order read API не має endpoint або code path, що приймає client-selected payment/order status.
- [ ] Customer/guest ownership і status timeline покриті negative та positive integration/e2e regression.

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

## Milestone 8.5 - Commerce API readiness gate

### Goal

Перевірити Milestone 8 як один reproducible commerce contract на clean databases і підготувати handoff для Supplier Cabinet без додавання supplier, shipping, returns або CRM behavior.

### Tasks

- [ ] Переконатися, що Open questions 1-7 закриті, а фактичні decisions синхронізовані в цьому plan без окремого conflicting spec.
- [ ] Відтворити disposable `auto_parts_dev` і guarded `auto_parts_test` лише з committed migrations; demo seed не використовувати як test prerequisite.
- [ ] Запустити повний regression для cart ownership, server pricing/stock, checkout idempotency, pending-before-redirect, webhook signature/idempotency і order read isolation.
- [ ] Провести concurrency rehearsal: два checkout requests на останній stock, duplicate/out-of-order Stripe events і compensating release не створюють oversell або double release.
- [ ] Звірити README/environment/API examples із фактичними routes, cookies, required headers, Stripe CLI local webhook workflow, error responses і lifecycle semantics без real secrets.
- [ ] Перевірити query plans/indexes для owner cart lookup, checkout Listing locks/updates, PaymentEvent idempotency та paginated order history; schema indexes додавати лише reviewed forward migration за measured evidence.
- [ ] Провести repository audit: historical migrations immutable, schema без drift, secrets/generated artifacts не tracked, frontend/Milestone 9-10 behavior відсутні.
- [ ] Оновити Tasks/DoD та Implementation log лише після фактичної Validation.

### Definition of Done

- [ ] Усі 8.1-8.4 Tasks/DoD позначені `[x]` лише після відповідної validation та reviewed migrations.
- [ ] Clean migration rehearsal, Prisma drift check, unit, integration, e2e і build проходять повторювано.
- [ ] Pending Order завжди створюється до redirect, а лише signature-verified webhook може встановити `PAID`.
- [ ] Duplicate/reordered webhook і checkout retry не створюють duplicate events/orders/timeline entries та не змінюють stock двічі.
- [ ] Guest/customer Cart і Orders мають підтверджену negative ownership coverage та не залежать від demo seed.
- [ ] API/environment документація відповідає фактичному commerce contract і не містить secrets.
- [ ] Milestone 9 може читати supplier-owned OrderItems без зміни customer payment/ownership lifecycle.

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

- 8.1 створює `Cart`/`CartItem` і guest/customer ownership constraints окремою named forward migration.
- 8.2 окремою migration розширює existing Order/OrderItem для guest ownership, checkout identity/expiry, immutable snapshots і timeline baseline.
- 8.3-8.4 не повинні змінювати schema, якщо 8.2 зафіксував повний webhook/timeline contract; measured missing index отримує окрему reviewed migration.
- Existing `PaymentEvent.externalEventId` unique constraint зберігається як DB idempotency boundary; не замінювати його in-memory deduplication.
- Migration SQL переглядати до apply, особливо nullable `Order.customerId`, XOR checks, unique owner/index semantics і OrderItem backfill для existing demo rows.
- Existing Orders із Milestone 6 seed треба data-preserving backfill-ити як customer-owned snapshots; не drop/recreate commerce tables і не редагувати historical migration.
- Destructive `db push`, edited migration checksums і `migrate reset` не є production rollback strategy.
- Rollback для середовища з даними - reviewed forward fix або database restore. Disposable local test DB можна відтворювати лише після existing URL guard.
- Stripe-side rollback не виконується DB rollback-ом: failed session creation або expiry використовує idempotent compensating Order transition і stock release.

## Risks and mitigations

- **Client price tampering.** Не приймати price/total як authoritative; checkout re-read і Order snapshots формуються server-side.
- **Overselling under concurrency.** Conditional stock update/locking у короткій transaction, explicit reservation expiry і integration test із competing checkouts.
- **Double stock release.** Conditional transition із expected `PENDING_PAYMENT` state; event, status, timeline і release виконуються атомарно один раз.
- **Webhook spoofing.** Exact raw body і Stripe signature verification до будь-якого DB mutation; webhook secret лише з environment.
- **Duplicate Stripe delivery.** Unique `PaymentEvent.externalEventId`, transaction і successful no-op acknowledgement для already processed event.
- **Out-of-order events.** Explicit transition allowlist і terminal-state guards; late expiry не скасовує `PAID` Order.
- **False payment from success page.** Redirect і order GET routes read-only; `PAID` mutation існує лише у verified webhook service.
- **Guest ownership theft.** High-entropy HttpOnly cookie, hashed persistence, no token in URL/body/logs і owner filter у кожному Prisma query.
- **Cross-owner data leak.** Customer/guest identity походить server-side; missing/cross-owner мають однакові errors і negative e2e coverage.
- **Long DB transaction around Stripe.** Provider call виконується після commit; failure має tested compensating path.
- **Snapshot drift.** OrderItem зберігає price та мінімальні display snapshots, тому future catalog/supplier edits не переписують історію.
- **Sensitive payload leakage.** Explicit response DTO/select, PaymentEvent payload internal-only, sanitized logs і placeholders у `.env.example`.
- **Test flakiness/live dependency.** Stripe port із deterministic fake, guarded `auto_parts_test`, suite-owned fixtures і жодного demo seed prerequisite.
- **Schema creep.** Shipping, returns, refunds, supplier workflows, payouts і frontend залишаються поза Milestone 8.
