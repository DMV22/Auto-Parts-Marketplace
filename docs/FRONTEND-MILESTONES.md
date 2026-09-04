# Execution plan: Frontend Auto Parts Marketplace

## Summary

Backend Milestones 6–10 сформували придатний для frontend-розробки API: автентифікацію, vehicle taxonomy, garage, catalog/PDP/fitment, cart/checkout/orders, Supplier Cabinet та Internal Ops. Фактичні NestJS controllers, DTO, guards, Prisma schema й integration/E2E tests підтверджують більшість описаних у планах контрактів.

Поточний verdict — **`READY_WITH_GAPS`**. Реалізацію public storefront і customer flows можна починати після узгодження browser-to-API transport. Повний Supplier Cabinet заблокований відсутністю API для визначення поточного Supplier membership і пошуку `ProductVariant`, а повноцінні catalog filters потребують стабільного vocabulary endpoint для brands/categories.

Цей документ не вводить нові backend-контракти. Відсутні endpoints позначені як dependencies, які мають бути погоджені та реалізовані окремо до відповідного frontend-підетапу.

## Goal

Послідовно побудувати production-oriented frontend на Next.js App Router, React і TypeScript поверх фактичних backend-контрактів, із чіткими межами ролей, cookie-based session/guest flows, fitment-aware UX, Stripe redirect lifecycle та окремими customer, supplier й internal workspaces.

## Non-goals

- Зміна Prisma schema, migrations або NestJS runtime behavior у межах цього плану.
- Дублювання backend authorization, ownership або transition policies у frontend.
- Власна payment form, client-side підтвердження оплати або зміна Order status із success/cancel page.
- Shipping/carrier integrations, payouts, Stripe Connect, refunds, disputes чи multi-warehouse UI.
- Реалізація frontend-компонентів у межах підготовки цього документа.
- Вигадування fallback endpoints, яких немає у фактичному backend.

## Context inspected

- `apps/api/src/`: bootstrap, auth, vehicle taxonomy, garage, catalog, commerce, supplier-cabinet та internal-ops modules.
- `apps/api/prisma/schema.prisma`: актуальні relations, enums, ownership і status-bearing records.
- `apps/api/test/`: unit, integration та E2E contract coverage для Milestones 6–10.
- `apps/web/`: поточний Next.js App Router scaffold і package scripts.
- `docs/BACKEND-PLAN.md`, `docs/CATALOG-API-PLAN.md`, `docs/COMMERCE-API-PLAN.md`, `docs/SUPPLIER-CABINET-API-PLAN.md`, `docs/INTERNAL-OPS-API-PLAN.md`, `docs/ROADMAP-MILESTONES.md`.

## Backend readiness verdict

**Verdict: `READY_WITH_GAPS`.**

### Readiness matrix

| Frontend domain           | Backend endpoints/contracts                                                                                   | Status                                                                                             | Gaps / risks                                                                                                 | Frontend readiness                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Public auth               | Better Auth `/api/auth/*`: email sign-up/sign-in, Google sign-in, sign-out, get-session, change-password      | Реалізовано; same-origin rewrite і cookie/session flows мають E2E coverage                         | Forgot-password/email-verification та account linking не входять у F0–F8                                     | Ready; real Google callback залишається external F8 evidence           |
| Vehicle selector          | `GET /api/v1/vehicles/years`, `/makes`, `/models`, `/generations`, `/engines`                                 | Реалізовано й протестовано; hierarchy і query validation стабільні                                 | Cascading selectors мають обробляти empty/stale selections                                                   | Ready                                                                  |
| Customer Garage           | `GET/POST /api/v1/garage/vehicles`, `PUT /:id/active`, `DELETE /:id`                                          | Реалізовано; Customer-only, owner-scoped                                                           | Не доступний Guest; це очікувана policy                                                                      | Ready                                                                  |
| Public catalog            | `GET /api/v1/catalog/products` і `/filter-options` із search, filters, vehicle context, pagination та sorting | Реалізовано й протестовано; G3 закрито                                                             | Product media використовує погоджені локальні fallback assets                                                | Ready                                                                  |
| PDP + fitment             | `GET /api/v1/catalog/products/:productId`; `compatible/incompatible/unknown/caution` + reason codes           | Реалізовано; exact-engine precedence покрита тестами                                               | Немає product media/image contract                                                                           | Ready з placeholder media                                              |
| Customer/Guest Cart       | `GET /api/v1/cart`, item create/update/delete, clear cart; backend-issued guest cookie                        | Реалізовано; live price/stock/status validation, owner isolation                                   | Cookie flow потребує same-origin/credentials; guest cart не merge-иться після sign-in                        | Ready після F0; merge відсутній за контрактом                          |
| Checkout                  | `POST /api/v1/checkout/session`; pending Order, reservation, `Idempotency-Key`, Stripe URL                    | Реалізовано; server-built success/cancel URLs містять `orderId`, redirect не змінює payment status | Frontend має валідовувати URL `orderId` і читати owner-protected Order; webhook залишається status authority | Ready для F4 без browser-storage recovery workaround                   |
| Customer Orders + Returns | Order history/detail/timeline; nested customer ReturnRequest routes                                           | Реалізовано; owner-only, non-disclosing `404`, cursor pagination                                   | Немає global “My Returns”; Guest не створює return самостійно                                                | Ready для returns у Order detail; окремий Returns screen blocked by G6 |
| Supplier Cabinet          | Supplier Listing CRUD/lifecycle/inventory; supplier OrderItems; current membership і ProductVariant discovery | Backend і frontend workspace реалізовані; G2/G5 закриті                                            | Production onboarding, shipping і payouts не входять у F6                                                    | Ready                                                                  |
| Internal OMS + Returns    | Internal order queue/detail/transitions; returns queue/detail/transitions                                     | Реалізовано; SupportManager/Admin RBAC, policies і audit atomicity                                 | Висока щільність status/error states потребує централізованих frontend mappings                              | Ready                                                                  |
| Notes + ActivityLog       | Internal note create/list/correct/redact; scoped/global activity reads                                        | Реалізовано; internal-only DTO projections                                                         | Frontend не повинен кешувати або показувати internal data поза protected workspace                           | Ready                                                                  |
| Admin moderation          | Moderation queue, approve/reject/emergency pause                                                              | Реалізовано; Admin-only, public ACTIVE-only invariant                                              | SupportManager не має implicit access; UI має відображати це явно                                            | Ready                                                                  |

## Backend contract assumptions

- Product API використовує `/api/v1`; Better Auth зберігає boundary `/api/auth/*`.
- Browser передає session і guest cookies автоматично; frontend не читає та не зберігає їх у `localStorage`.
- `Guest` — server-side context, а не persisted role. Наявність customer session має пріоритет над guest cart cookie.
- Backend є єдиним authority для user role, supplier membership, ownership, price, currency, stock, fitment і status transitions.
- Public Catalog, PDP і Cart використовують лише `ACTIVE` Listings.
- `404` для чужого ресурсу є non-disclosing response; frontend не відрізняє “не існує” від “не належить користувачу”.
- `409 Conflict` при inventory/stock race означає: відкинути optimistic assumption, refetch актуального ресурсу та запропонувати контрольований retry.
- Checkout створює `PENDING` Order до Stripe redirect. Success/cancel route лише перечитує Order; оплату підтверджує тільки signature-verified webhook.
- Customer/Guest Orders та Supplier OrderItems мають різні DTO; frontend не намагається реконструювати повний Order у supplier workspace.
- `Note`, `ActivityLog`, payment payload, Stripe metadata, guest token hash та internal fields не потрапляють у public/customer/supplier state.

## API gaps and dependencies

### Blocking gaps

| ID  | Gap                                                                                   | Impact                                                                                                            | Required clarification/fix before dependent milestone                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Відсутня browser transport policy: Nest не вмикає CORS, Next не має API rewrite/proxy | Cookie auth, Guest Cart та всі browser mutations не працюватимуть між `localhost:3000` і `localhost:3001` напряму | Зафіксувати same-origin baseline: Next rewrite/BFF proxy для `/api/*` у development і єдиний origin ingress у deployment. Альтернатива — explicit credentialed CORS allowlist + cookie policy в Nest |

- **G3 — Closed:** реалізовано bounded deterministic `GET /api/v1/catalog/filter-options` для public Brand, Category і currency price-range vocabulary поверх `ACTIVE` Listings.
- **G4 — Closed:** Stripe adapter формує success/cancel URLs із `orderId`; success додатково містить literal `{CHECKOUT_SESSION_ID}`, тому frontend відновлює Order через owner-protected read API без `sessionStorage`.
- **G2 — Closed:** `GET /api/v1/me/supplier-membership` повертає owner-safe active/inactive membership поточного session user або `data: null`; Admin не отримує synthetic membership.
- **G5 — Closed:** supplier-scoped `GET /api/v1/suppliers/:supplierId/product-variants` і `GET /:productVariantId` надають guarded canonical ProductVariant discovery з bounded opaque cursor pagination.

### Non-blocking gaps and known limitations

| ID  | Gap / limitation                                                              | Frontend handling or recommended follow-up                                                                        |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| G6  | Немає customer-wide Returns list/detail; customer routes вкладені в OrderItem | У першій версії показувати returns в Order detail; не створювати окрему “My Returns” сторінку без нового endpoint |
| G7  | Guest не може самостійно створити ReturnRequest                               | Показати пояснення/support path; не маскувати це як тимчасову UI-помилку                                          |
| G8  | Product/PDP DTO не має media URLs                                             | Використовувати доступний placeholder без вигаданих image fields; погодити media domain окремо                    |
| G9  | Немає OpenAPI/generated frontend client або shared DTO package                | Створити один ручний typed API boundary і contract fixtures; не розкидати `fetch`/response casts по компонентах   |
| G10 | Better Auth error shape і Nest error shape не уніфіковані                     | Нормалізувати transport errors у frontend API layer; UI працює з власним `AppError` union                         |
| G11 | Немає frontend E2E fixture orchestration                                      | У F0 погодити test-only setup для deterministic users/roles/data; не використовувати demo seed як передумову CI   |
| G12 | Forgot password та email verification не налаштовані                          | Не показувати ці UI actions у першій версії; винести в окрему auth requirement                                    |

## Frontend architecture

### Application boundary

- `apps/web` — єдиний Next.js App Router application.
- Browser звертається до relative `/api/...`; routing до Nest визначається F0 transport decision.
- Один typed API layer відповідає за URL, credentials, JSON parsing, error normalization і request correlation; React components не викликають backend через випадкові raw `fetch` wrappers.
- Server Components використовуються для route composition і початкового read rendering. Client Components додаються лише для форм, selectors, mutations, polling та локальної взаємодії.
- Authenticated/owner data має `no-store` semantics. Public catalog data може використовувати лише короткий, явно погоджений cache window; live price/stock перевіряються backend під час Cart/Checkout.
- Request-scoped server reads не використовують mutable module-level session state.

### Suggested source layout

```text
apps/web/src/
  app/
    (public)/
    (customer)/
    (supplier)/
    (internal)/
    (admin)/
  features/
    auth/ vehicles/ garage/ catalog/ fitment/
    cart/ checkout/ orders/ returns/
    supplier/ internal-ops/ moderation/
  components/
    ui/ layout/ feedback/
  lib/
    api/ auth/ query/ validation/ routing/
  test/
```

Feature folders володіють DTO mappings, query keys, form schemas і UI composition. `components/ui` містить лише reusable presentation primitives.

## Route groups and access model

| Route group     | Candidate routes                                                                                          | Access model                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `(public)`      | `/`, `/catalog`, `/products/[productId]`, `/sign-in`, `/sign-up`, `/checkout/success`, `/checkout/cancel` | Public; деякі screens адаптуються до optional session/vehicle context              |
| `(customer)`    | `/garage`, `/orders`, `/orders/[orderId]`                                                                 | Authenticated active `Customer`; backend guard залишається authority               |
| shared commerce | `/cart`                                                                                                   | Authenticated Customer або Guest cookie context                                    |
| `(supplier)`    | `/supplier/[supplierId]/listings`, `/inventory`, `/order-items`                                           | Active `SupplierUser` membership; Admin bypass лише там, де він дозволений backend |
| `(internal)`    | `/internal/orders`, `/internal/returns`, `/internal/activity`                                             | `SupportManager` або `Admin` відповідно до endpoint policy                         |
| `(admin)`       | `/admin/moderation`                                                                                       | `Admin` only                                                                       |

Route layouts можуть приховувати navigation і робити UX redirects, але кожен API request все одно проходить backend guards. `401`, `403` і non-disclosing `404` обробляються окремо.

## State management and data-fetching strategy

- **URL state:** catalog search, filters, sorting і pagination; internal/supplier queue filters і cursor navigation, коли URL можна стабільно відтворити.
- **Server state:** session, taxonomy, garage, catalog, cart, orders, supplier/internal records. Recommended baseline — TanStack Query для client-side mutations, invalidation, polling і race handling; Server Components можуть preload/dehydrate тільки коли це не ускладнює cookie forwarding.
- **Local component state:** open/closed UI, draft selector step, unsaved form values. Воно не є authority для backend records.
- **Session:** тільки HttpOnly backend cookie. Current user отримується через `/api/auth/get-session`; sensitive session tokens не серіалізуються в browser storage.
- **Guest cart:** тільки backend-issued HttpOnly cookie. Frontend не створює власний guest identity.
- **Checkout attempt:** UUID `Idempotency-Key` генерується один раз на user action і перевикористовується для safe retry того самого attempt. Він не є session credential.
- **Order recovery:** server-built success/cancel URLs містять `orderId`; frontend не зберігає його в browser storage, а payment status завжди перечитує з owner-protected Orders API.
- **Mutations:** після успіху invalidation робиться за domain query keys. Blind optimistic updates не використовуються для stock, lifecycle transitions, payments або moderation.

## Error, loading and empty-state strategy

Кожен data screen повинен мати:

- route-level `loading.tsx` або локальний skeleton без layout shift;
- domain-specific empty state з дозволеною наступною дією;
- retryable transport/server state;
- permission-denied state для `403` без витоку internal details;
- non-disclosing not-found state для `404`;
- conflict state для `409`, що refetch-ить authoritative data;
- unavailable state для `503` на Checkout без втрати cart/order context.

Frontend error adapter нормалізує Nest `{ statusCode, message, error }`, validation arrays і Better Auth errors у discriminated `AppError`. Повідомлення користувачу не показують raw stack, SQL, provider payload або internal reason metadata.

## Forms, validation and optimistic update strategy

- Client validation покращує UX, але не замінює Nest DTO validation.
- Recommended baseline: React Hook Form + Zod schemas біля feature forms; API DTO types залишаються окремими від form view-models.
- Server-owned fields (`supplierId`, user id, role, status, totals, timestamps, stock authority) не входять у editable form contract.
- Garage label і simple profile forms можуть оновлюватися optimistic лише з rollback.
- Cart quantity може показувати pending state, але остаточне значення/issue береться з response.
- Inventory update ніколи не “вгадується”: надсилає `expectedVersion`; при `409` refetch → показ актуального stock/version → explicit retry.
- Listing, Order, Return і moderation transitions показують pending state, блокують duplicate submit і після response перечитують resource/timeline.
- Checkout mutation використовує stable `Idempotency-Key`; подвійне натискання не створює новий attempt.

## Testing strategy

- **Unit:** pure formatters, fitment/status mappings, route/access helpers, query serializers, error normalization.
- **Component:** React Testing Library для forms, selectors, loading/empty/error/permission states та accessibility behavior.
- **API contract:** MSW/fixture responses, вручну синхронізовані з backend E2E contracts до появи generated client.
- **Integration:** feature flows із Query client, router і cookie-aware mocked transport.
- **E2E:** Playwright для auth, vehicle/catalog, guest/customer cart/checkout, orders, supplier inventory conflict та internal moderation/returns.
- **Backend boundary:** frontend E2E setup створює власні deterministic fixtures в guarded environment і не залежить від demo seed чи live Stripe. Stripe redirect/webhook симулюється тільки погодженим test adapter/workflow.
- **Contract drift:** при зміні backend DTO/route відповідний frontend contract fixture та critical E2E scenario змінюються в одному pull request.

## Performance and accessibility constraints

- Паралелізувати незалежні reads і використовувати Suspense boundaries, щоб уникати sequential request waterfalls.
- Передавати в Client Components мінімальні serializable projections, а не великі Prisma-shaped objects.
- Не дублювати той самий read у кількох components; query keys і request memoization централізовані.
- Search input debounce-иться, але URL і backend query залишаються source of truth.
- Великі internal/supplier таблиці використовують server pagination, не in-memory filtering.
- Fitment result передається текстом, icon і семантикою, а не лише кольором; `unknown`/`caution` не виглядають як guarantee.
- Forms мають labels, field errors, focus management і keyboard navigation.
- Async status/checkout/polling updates мають accessible live-region повідомлення без надмірного announce noise.
- Modal/dialog primitives використовують доступні shadcn/ui patterns; reduced motion підтримується.
- Performance budget і Lighthouse thresholds фіксуються у F8 після появи representative pages.

## Proposed approach

1. Спочатку закрити F0 contract/platform gate: transport, frontend tooling, API boundary і blocking ownership/filter dependencies.
2. Реалізувати vertical slices від public read flows до sensitive write flows: auth → vehicle/catalog → commerce → supplier → internal.
3. Для кожного slice спочатку зафіксувати actual DTO fixture/error matrix, потім UI states, mutation behavior і E2E happy/denied/conflict paths.
4. Не переносити backend policies у UI. Frontend використовує role-aware navigation і affordances, а backend response залишається остаточним рішенням.
5. Кожен milestone завершується build/type/lint/test gate; full repository regression виконується у F8.

---

## Milestone F0 — Frontend platform and contract gate

### Goal

Підготувати стабільний frontend foundation і закрити блокери, без яких cookie-based browser integration та Supplier Cabinet не можуть бути реалізовані надійно.

### Screens/routes

- Minimal application shell і diagnostic development route лише за потреби; product screens ще не реалізуються.

### Backend dependencies

- Decision і implementation для G1.
- Узгоджені backend issues/contracts для G2, G3, G5; G4 закритий server-built success/cancel URL contract із `orderId`.

### Components/features

- Tailwind CSS і shadcn/ui foundation.
- Root providers, typed API client, `AppError`, query client, route/access metadata.
- Test runners і fixture conventions.

### State/data ownership

- Server state через централізований query/API layer.
- Cookie credentials належать backend/browser; storage tokens заборонені.

### Tasks

- [x] Зафіксувати same-origin development/deployment topology для `/api/*`.
- [x] Додати Tailwind/shadcn/ui та базові design tokens у `apps/web`.
- [x] Додати TanStack Query, Zod і test tooling після package review; React Hook Form відкладено до F1, де з'являються реальні форми.
- [x] Створити typed API transport із `credentials`, abort support і error normalization.
- [x] Створити auth/session bootstrap без client token storage.
- [x] Зафіксувати DTO fixture naming і query-key conventions.
- [x] Зафіксувати owner, contract і target milestone для backend dependencies G2, G3, G5.
- [x] Додати `test` і `test:e2e` scripts до `apps/web/package.json`.

### Definition of Done

- [x] Browser може виконати credentialed get-session і guest cart request через погоджаний origin.
- [x] API errors 400/401/403/404/409/503 мають typed frontend representation.
- [x] Жоден session/guest token не потрапляє в local/session storage.
- [x] UI primitives, lint, typecheck, unit/component та E2E harness запускаються локально.
- [x] Blocking backend dependencies мають owner, contract і target milestone.

### Testing

- API transport unit tests; cookie/credentials smoke E2E; error normalization tests; accessibility smoke для shell.

### Validation

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

### Backend gaps після F0

| Gap                                       | Класифікація    | Owner / target                  | Зафіксований contract                                                                                                                  |
| ----------------------------------------- | --------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| G1 — browser transport                    | Closed          | Frontend platform / F0          | Browser використовує relative `/api/*`; Next rewrite направляє запити до `API_INTERNAL_URL`; CORS не потрібен за same-origin topology  |
| G2 — active Supplier membership discovery | Blocking для F6 | Backend / до початку F6         | Owner-safe current membership response із `supplierId`, status і мінімальною Supplier projection                                       |
| G3 — catalog filter vocabulary            | Closed          | Backend / prerequisite перед F3 | Public `GET /api/v1/catalog/filter-options`; `ACTIVE`-only Brand/Category options і currency price ranges, cap `100`, `meta.truncated` |
| G5 — supplier ProductVariant discovery    | Blocking для F6 | Backend / до початку F6         | Read-only supplier-safe ProductVariant search/detail із bounded pagination                                                             |
| G4 — Order recovery після Stripe redirect | Closed          | Backend Checkout + F4           | Server-built success/cancel URLs містять `orderId`; success також містить Stripe `session_id`, browser storage не потрібен             |

### Implementation log

#### What changed

- Налаштовано same-origin Next rewrite для `/api/*` із server-only `API_INTERNAL_URL`.
- Додано Tailwind CSS 4, app-local shadcn/ui, semantic tokens і мінімальний accessible platform shell.
- Додано typed cookie-aware API client, `AppError`, Zod-validated safe session projection і TanStack Query boundary.
- Додано Vitest, Testing Library, MSW та Playwright із guarded `auto_parts_test`, committed migrations і production build rehearsal.
- Додано tests для API errors, abort/path contracts, session drift/token stripping, route visibility metadata, semantic shell, browser fetch proxy та backend-issued Guest Cart cookie.
- Зафіксовано reusable DTO fixture naming convention; backend-only test secrets не передаються Next process.

#### Validation results

- `pnpm --filter web lint` — passed.
- `pnpm --filter web check-types` — passed.
- `pnpm --filter web test` — passed: 4 files, 16 tests.
- `pnpm --filter web test:e2e` — passed: migrations current, production build passed, 2 Playwright tests passed.
- `git diff --check` — passed; whitespace errors were not found.

### Handoff to F1

- Використовувати `apiRequest`, `AppError`, `sessionQueryOptions` і чинні query-key conventions; не створювати другий fetch/session layer.
- Додати React Hook Form у F1 разом із першими sign-in/sign-up forms; Zod уже доступний для form view-model validation.
- Local integrated auth має використовувати browser-visible `BETTER_AUTH_URL=http://localhost:3000`; Google callback проходить через `/api/auth/*` rewrite.
- Session/guest cookies залишаються HttpOnly; F1 не копіює token або guest identity у browser storage.
- F1 покриває email/password, Google redirect initiation, sign-out, inactive/anonymous states і safe post-auth navigation; supplier membership лишається dependency F6.

## Milestone F1 — Public shell and authentication

### Goal

Реалізувати public navigation та session-based email/password і Google authentication без витоку cookie/token details у frontend state.

### Screens/routes

- `/`, `/sign-in`, `/sign-up`.
- Role-aware post-auth redirect до customer, supplier, internal або admin workspace.

### Backend dependencies

- Better Auth `/api/auth/sign-up/email`, `/sign-in/email`, `/sign-in/social`, `/sign-out`, `/get-session`.
- G1 має бути закритий.

### Components/features

- App header, session menu, sign-in/sign-up forms, Google OAuth action, auth error states.

### State/data ownership

- Session — server state; form drafts — local state; role — тільки session response.

### Tasks

- [x] Реалізувати current-session query та server/client hydration boundary.
- [x] Реалізувати sign-up/sign-in forms з Better Auth-compatible payloads.
- [x] Реалізувати Google redirect flow і callback recovery.
- [x] Реалізувати sign-out з query cache cleanup.
- [x] Додати active/inactive/unauthenticated states і safe `returnTo` handling.
- [x] Не показувати forgot-password/email-verification actions до появи backend contract.

### Definition of Done

- [x] Email sign-up/sign-in, Google sign-in і sign-out працюють через HttpOnly session cookie.
- [x] Refresh відновлює session без browser token storage.
- [x] Role-aware navigation не надає access, а лише покращує UX.
- [x] Auth errors мають accessible form/global feedback.

### Testing

- Form component tests; mocked auth contract tests; E2E email auth, Google redirect initiation, sign-out і protected-route denial.

### Validation

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

### Implementation log

#### What changed

- Додано public shell із responsive header та session-aware anonymous, loading, unavailable, inactive й authenticated states.
- Реалізовано email sign-up/sign-in через React Hook Form, Zod і Better Auth-compatible payloads; forgot-password/email-verification UI свідомо відсутній.
- Реалізовано Google OAuth initiation через same-origin `/api/auth/*`; callback повертається на safe relative `returnTo` або `/`.
- Додано server-side session preload із forwarding cookie до `API_INTERNAL_URL` та hydration лише frontend-safe session projection без token.
- Sign-out очищає frontend query cache; role використовується лише для UX label, а не як authorization boundary.
- Додано app-local shadcn form primitives, CSS Modules, accessible inline/global errors, focus states і reduced-motion-safe pending indicators.

#### Validation results

- `pnpm --filter web test` — passed: 8 files, 34 tests.
- `pnpm --filter web test:e2e` — passed: production build, 5 Playwright tests, guarded `auto_parts_test`, no browser download; sign-out перевірено після reload, а anonymous protected-route denial повертає `401`.
- Google browser E2E перевіряє redirect initiation до Google; зовнішній provider callback не автоматизується, а recovery спирається на backend Better Auth callback contract і повторне session hydration.
- `pnpm --filter web check-types` — passed; route types для `/`, `/sign-in`, `/sign-up` generated successfully.
- `pnpm --filter web lint` — passed без warnings.
- `git diff --check` — passed; whitespace errors не знайдено.

### Handoff to F2

- Використовувати наявні `sessionQueryOptions`, `queryKeys.auth.session` та `AppHeader`; не створювати другий session store.
- Customer Garage routes можуть передавати тільки validated relative `returnTo`; fallback залишається `/` до появи стабільних workspace landing routes.
- Backend залишається єдиною authorization boundary; frontend role metadata керує лише видимістю navigation actions.
- Нові screens продовжують CSS Module convention; глобальні tokens/reset залишаються в `app/globals.css`.
- F2 не повинен додавати Supplier membership discovery або catalog behavior; це залежності наступних milestones.

## Milestone F2 — Vehicle selector and Customer Garage

### Goal

Дати користувачу canonical Year → Make → Model → Generation → Engine selector та Customer-only garage з active vehicle context.

### Screens/routes

- Reusable vehicle selector у header/catalog context.
- `/garage`.

### Backend dependencies

- Public vehicle taxonomy endpoints.
- Customer Garage CRUD/active endpoints.

### Components/features

- Cascading selector, saved vehicle list/card, label form, active marker, delete confirmation.

### State/data ownership

- Selector draft — local state; taxonomy/garage — server state; active vehicle — backend record plus invalidated cached context.

### Tasks

- [x] Реалізувати cascading queries зі скиданням downstream selections.
- [x] Валідувати complete generation/engine combination перед save.
- [x] Реалізувати garage list/create/set-active/delete.
- [x] Підготувати active `savedVehicleId` query context для catalog/PDP через спільний Garage cache helper; фактичне додавання до Catalog/PDP requests належить F3.
- [x] Додати Guest CTA до sign-in замість persisted guest garage.

### Definition of Done

- [x] Selector не надсилає stale IDs після зміни Year/Make/Model.
- [x] Customer бачить і змінює лише власні vehicles.
- [x] Active vehicle відновлюється з Garage response після refresh і доступний F3 через `getActiveSavedVehicleId`.
- [x] Empty taxonomy/garage і ownership `404` мають визначені UI states.

### Testing

- Selector state-machine unit/component tests; Garage mutation integration tests; E2E create/activate/delete і unauthenticated denial.

### Validation

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

### Implementation log

#### What changed

- Додано typed і Zod-validated frontend contract для public vehicle taxonomy та Customer Garage API.
- Реалізовано reusable Year → Make → Model → Generation → Engine selector із залежними TanStack Query запитами та гарантованим downstream reset.
- Додано Customer-only `/garage` із list/create/activate/delete, exact engine policy, active marker, empty/error/permission states і підтвердженням видалення.
- Guest отримує sign-in CTA з validated relative `returnTo`; session, vehicle ownership і active pointer залишаються backend-owned.
- Додано `getActiveSavedVehicleId` як cache-derived handoff для F3 без передчасної реалізації Catalog/PDP requests.

#### Validation results

- Targeted F2 tests — passed: 3 files, 4 tests; перевірено downstream reset, selector loading/cascade та activate mutation із Garage query invalidation. Після виявленого timing flake `vehicle-selector.spec.tsx` отримав локальний `10s` timeout для п’яти послідовних mocked taxonomy requests і пройшов окремий regression run.
- `pnpm --filter web test:e2e` — passed: committed migrations актуальні, production build успішний, 5 Playwright tests пройшли; F1 email session refresh/sign-out/sign-in locator scoped до header navigation після появи другого public sign-in CTA.
- `pnpm --filter web lint` — passed без warnings після regression fixes.
- `pnpm --filter web check-types` — passed; route types для `/`, `/garage`, `/sign-in` і `/sign-up` generated successfully.
- `pnpm --filter web test` — passed; F2 Garage browser create/activate/delete flow залишається deferred до F8, а production build був перевірений усередині guarded E2E runner.

#### Deferred E2E scenarios for F8

- Customer створює exact SavedVehicle, refresh-ить `/garage` і бачить ту саму server-owned комплектацію.
- Customer активує інший SavedVehicle, після refresh зберігається один active vehicle.
- Customer підтверджує delete; active pointer очищається, а повторний/cross-owner `404` не розкриває ownership details.
- Anonymous і non-Customer sessions отримують відповідні sign-in/permission states без persisted guest garage.
- F3 Catalog/PDP requests використовують active `savedVehicleId` і коректно реагують на його видалення.

### Handoff to F3

- Використовувати `garageVehiclesQueryOptions`, `queryKeys.garage.vehicles` і `getActiveSavedVehicleId`; не створювати окремий active-vehicle client store.
- Додавати `savedVehicleId` до Catalog/PDP request лише коли Garage response позначає vehicle як active; anonymous catalog залишається public.
- Taxonomy DTO/query options і `VehicleSelector` є спільним read-only foundation; F3 не дублює cascade або response parsing.
- `compatible`, `incompatible`, `unknown` і `caution` залишаються backend fitment contract; F2 не робить compatibility висновків.

## Milestone F3 — Public Catalog, PDP and fitment UX

### Goal

Реалізувати URL-driven catalog і PDP, які чесно показують availability, ціни та чотири fitment outcomes.

### Screens/routes

- `/catalog`.
- `/products/[productId]`.

### Backend dependencies

- Catalog list/PDP endpoints.
- Vehicle selector/garage context.
- G3 закрито public filter-options contract; G8 допускає placeholder media.

### G3 contract handoff

- `GET /api/v1/catalog/filter-options` є public read-only endpoint без query parameters.
- Response містить `data.brands[]` і `data.categories[]` як `{ id, name }`, а `data.currencies[]` як `{ code, minimumPrice, maximumPrice }`; Decimal prices серіалізуються рядками.
- Vocabulary і price ranges будуються лише з `ACTIVE` Listings; out-of-stock `ACTIVE` Listings залишаються частиною public options.
- Collections мають deterministic sorting і server cap `100`; `meta.truncated = true`, якщо хоча б одна collection має більше значень.
- Targeted validation: unit `1/1`, integration `2/2`, E2E `1/1` — passed; E2E підтверджує anonymous access і відхилення query parameters.

### Components/features

- Search, allowlisted filters, sort, pagination, product cards, variant/listing offers, FitmentBadge/FitmentExplanation.

### State/data ownership

- Query string — source of truth для filters/sort/page; results — server state; active vehicle — Garage/context.

### Tasks

- [x] Серіалізувати лише documented catalog query params.
- [x] Реалізувати debounce search і URL navigation без in-memory filtering.
- [x] Реалізувати bounded pagination та deterministic sort options.
- [x] Показати лише backend-returned ACTIVE offers; не виводити власний availability guess.
- [x] Відобразити `compatible`, `incompatible`, `unknown`, `caution` і reason codes без false-positive language.
- [x] Додати PDP vehicle-context switch і placeholder media policy.

### Definition of Done

- [x] Catalog URL відтворює той самий query state після refresh/share.
- [x] Invalid filters мають recoverable error/reset flow.
- [x] Усі fitment statuses доступно відрізняються не лише кольором.
- [x] “No FitmentRule” показується як unknown, а не compatible.
- [x] Loading/empty/error states не приховують активні filters.

### Testing

- Query serializer/status mapping unit tests; catalog/PDP component tests; E2E search/filter/pagination і exact/generation/unknown/caution fitment paths.

### Validation

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

### Implementation log (F3)

- Реалізовано URL-driven `/catalog`: allowlisted search/Brand/Category/condition/stock/currency/price filters, deterministic sorting, bounded pagination і server-state loading/error/empty views.
- Підключено public G3 filter-options contract; URL canonicalization, default currency та vocabulary recovery об’єднано в один pure resolution boundary.
- Реалізовано `/products/[productId]` із server-prefetched public PDP, TanStack hydration, contract-validated DTO, public variant/listing projections, backend-owned availability та локальним placeholder замість вигаданих media fields.
- Public product read більше не чекає client-side session → Garage waterfall; owner-specific fitment підвантажується окремим query key після визначення active SavedVehicle, а route-level loading boundary покриває початковий server read.
- Active Garage vehicle передається в Catalog/PDP тільки як owner-validated `savedVehicleId`; PDP дозволяє тимчасово вимкнути vehicle context без зміни Garage.
- Додано `FitmentBadge` і explanation copy для `compatible`, `incompatible`, `unknown`, `caution`; icon, текст і reason explanation не покладаються лише на колір, а `NO_FITMENT_DATA` не перетворюється на сумісність.

### Validation results (F3)

- `pnpm --filter web test -- catalog` — passed: 4 files, 6 tests.
- `pnpm --filter web lint` — passed.
- `pnpm --filter web check-types` — passed.
- `git diff --check` — passed; наявні лише informational LF/CRLF warnings від Git на Windows.
- Two-axis F3 changed-files review — Standards pass, Spec pass після усунення server-read waterfall, cross-product placeholder reuse та excessive live-region announcements.
- Full Playwright E2E та production build не запускалися відповідно до обмеженої F3 test strategy; вони залишаються readiness-перевіркою F8.

### G3/G8 dependency status

- **G3 — Closed:** frontend використовує public `GET /api/v1/catalog/filter-options`; невідомі vocabulary values скидаються лише коли response не truncated.
- **G8 — Deferred, non-blocking:** backend не повертає media URLs; Catalog/PDP показують явний локальний placeholder без synthetic product images.

### Deferred E2E scenarios for F8

- Refresh/share Catalog URL із search, filters, sort і pagination.
- Catalog navigation до PDP та owner-validated active `savedVehicleId` після login/refresh.
- PDP exact-engine override, generation fallback, `ENGINE_REQUIRED`, `NO_FITMENT_DATA` і vehicle-context toggle.
- Public Catalog/PDP loading, empty, invalid-filter recovery, unavailable product і anonymous behavior.

### F4 handoff

- Product cards ведуть на `/products/[productId]`; PDP показує лише backend-returned public Listings і не створює локальної availability/price truth.
- Для Cart F4 потрібно використовувати конкретний `listing.id` із PDP response та повторно покладатися на server-side Cart validation; fitment presentation не є дозволом на checkout.
- Active vehicle залишається Garage-derived query context; session або guest identity не зберігаються у browser storage.

## Milestone F4 — Guest/Customer Cart and Stripe Checkout

### Goal

Реалізувати owner-isolated Cart, server-authoritative checkout redirect та безпечне очікування webhook-driven Order status.

### Screens/routes

- `/cart`, `/checkout/success`, `/checkout/cancel`.

### Backend dependencies

- Cart і Checkout endpoints; guest cookie; G1.
- G4 closed contract: server-built success/cancel URLs із `orderId`; success також містить Stripe `session_id`.

### Components/features

- Cart drawer/page, quantity controls, issue banners, totals, Checkout button, redirect/polling states.

### State/data ownership

- Cart/Order — server state; guest identity — HttpOnly cookie; checkout attempt key — ephemeral mutation state; recovery `orderId` — validated URL state.

### Tasks

- [x] Реалізувати Customer/Guest Cart reads і mutations із credentials.
- [x] Показати backend availability issues та current price/currency без client recalculation authority.
- [x] Обробити Customer precedence і documented no-merge behavior після sign-in.
- [x] Генерувати один UUID `Idempotency-Key` на checkout attempt.
- [x] Перейти лише на server-returned Stripe URL і відновити Order із URL `orderId` без browser storage.
- [x] На success/cancel перечитувати Order status; не викликати status mutation.
- [x] Реалізувати bounded polling із timeout/manual refresh і 503 recovery.

### Definition of Done

- [x] Guest Cart переживає refresh без localStorage token.
- [x] Cart stale listing/stock/currency conflicts мають actionable UI.
- [x] Double-click/retry не створює довільні checkout attempts.
- [x] Success page не показує “Paid” до підтвердження Orders API.
- [x] Cancel page зберігає зрозумілий шлях назад до cart/order.

### Testing

- Cart mutation/component tests; idempotency/polling unit tests; E2E guest/customer cart, stale stock, redirect, pending→paid simulation і cancel.

### Validation

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

### Implementation log (Milestone F4)

#### What changed

- Додано owner-aware Cart drawer і `/cart` для Guest та active Customer із backend-issued HttpOnly guest cookie, server-authoritative totals і actionable availability issues.
- PDP додає до Cart лише фактичний `listingId`; reads і mutations використовують спільний typed API/query layer та замінюють cache тільки server response.
- Додано checkout attempt boundary: один ephemeral UUID `Idempotency-Key`, synchronous double-submit guard, reuse лише після невизначеної network/abort помилки та новий key після explicit failure.
- Browser переходить виключно на `checkoutSession.url`, повернений backend. `/checkout/success` і `/checkout/cancel` валідовують URL `orderId` та читають owner-protected Order без status mutation або browser storage.
- `PENDING_PAYMENT` перевіряється bounded polling кожні 2 секунди до 30 секунд; після timeout/503 доступний manual refresh, а “Оплату підтверджено” показується лише для status, отриманого з Orders API.

#### Validation results

- Targeted F4 tests — passed: 5 files, 5 tests (`cart-presentation`, `cart-item`, `checkout-attempt`, `checkout-button`, `checkout-status`).
- `pnpm --filter web lint` — passed.
- `pnpm --filter web check-types` — passed; Next route types generated successfully.
- `git diff --check` — passed; whitespace errors were not found.
- Full web test suite, production build і Playwright E2E не запускалися відповідно до обмеженої F4 test strategy.

#### G4 status

- **Closed:** backend формує success/cancel URLs із `orderId`, success URL також містить Stripe `session_id`; frontend не зберігає recovery identifiers у `localStorage` або `sessionStorage`.

#### Deferred E2E scenarios for F8

- Guest Cart cookie survives reload; Customer precedence clears/ignores the prior guest context without cart merge.
- ACTIVE Listing add/update/remove/clear, stale price/stock/currency conflict і unavailable checkout block.
- Checkout double-click та uncertain retry reuse one attempt; Stripe redirect uses only the server URL.
- Stripe success: `PENDING_PAYMENT` remains pending until a verified webhook, then polling observes `PAID`.
- Stripe cancel, delayed webhook, 503/manual refresh, timeout and foreign/missing `orderId` recovery states.

### Handoff to F5

- Reuse `OrderDetail`, `getOrderDetail`, `orderDetailQueryOptions` and `queryKeys.commerce.order`; do not introduce a second Order detail contract.
- F5 may add history/timeline query keys and route UI, while checkout return pages remain read-only projections of the same owner-protected Order.
- Preserve non-disclosing `404`, immutable OrderItem snapshots and the rule that only verified Stripe webhooks establish payment state.
- Guest identity remains an HttpOnly cookie; Customer/Guest Orders and Returns must not move owner identifiers into browser storage.

## Milestone F5 — Customer/Guest Orders and Returns

### Goal

Надати owner-only order history/detail/timeline та Customer return actions у межах фактичного nested contract.

### Screens/routes

- `/orders`, `/orders/[orderId]`.
- Returns section усередині Order detail; окремий `/returns` не створюється до закриття G6.

### Backend dependencies

- Customer/Guest Orders endpoints.
- Customer nested ReturnRequest endpoints.

### Components/features

- Cursor list, snapshot item detail, status timeline, return form/list/cancel, guest limitation message.

### State/data ownership

- Orders/returns — server state; cursor у URL; return draft — form state.

### Tasks

- [x] Реалізувати order history із cursor pagination.
- [x] Реалізувати detail на immutable snapshots, а не current Listing data.
- [x] Відобразити public timeline reason/status contract.
- [x] Додати Customer-only return create/read/cancel для delivered owned OrderItem.
- [x] Показати Guest support path замість неіснуючого self-service action.
- [x] Обробити non-disclosing `404` однаково для missing/foreign records.

### Definition of Done

- [x] Customer і Guest бачать лише власні Orders.
- [x] Timeline не показує PaymentEvent payload/internal metadata.
- [x] Return action доступна лише для eligible delivered item і підтверджується backend.
- [x] Duplicate/invalid return errors мають конкретний recoverable UI state.

### Testing

- DTO projection/status mapping tests; order/return component tests; E2E owner/foreign/guest/customer paths і cursor pagination.

### Validation

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

### Implementation log (Milestone F5)

#### What changed

- Додано `/orders` і `/orders/[orderId]` з owner-protected history/detail reads, opaque cursor pagination та однаковим non-disclosing `404` для missing/foreign Order.
- Order detail відображає immutable `OrderItem` snapshots і public status timeline без `PaymentEvent` payload, Stripe metadata або internal fields.
- Customer може переглядати, створювати й скасовувати nested ReturnRequest для власного delivered OrderItem; cancellable statuses відповідають backend policy.
- Guest бачить власні Orders через HttpOnly guest cookie, але замість неіснуючої return mutation отримує пояснення про support path.
- Після create/cancel і при duplicate `409` frontend invalidates nested Return query та перечитує authoritative backend state.

#### Validation results

- Targeted F5 tests — passed: 3 files, 6 tests (`order-presentation`, `return-presentation`, `return-item-panel`).
- `pnpm --filter web lint` — passed.
- `pnpm --filter web check-types` — passed; Next route types generated successfully.
- `git diff --check` — passed; whitespace errors were not found.
- Full web suite, production build і Playwright E2E не запускалися відповідно до обмеженої F5 test strategy.

#### G6 status

- **Open, non-blocking:** backend не має customer-wide Returns list/detail. F5 показує ReturnRequest лише всередині фактичного nested OrderItem contract і не створює вигаданий `/returns` screen.
- **G7 handled by contract:** Guest self-service return відсутній; UI не викликає Customer endpoint і показує чесний support-path state.

#### Deferred E2E scenarios for F8

- Customer і Guest history/detail/timeline з owner/foreign/missing Order та opaque cursor navigation.
- Immutable OrderItem snapshot залишається доступним після зміни або архівації поточного Listing.
- Customer create/read/cancel ReturnRequest для delivered item; duplicate `409`, invalid status і concurrent transition recovery.
- Guest бачить support-path state і не надсилає Customer-only Return mutation.
- Timeline не розкриває PaymentEvent payload/internal metadata у browser response або rendered UI.

### Handoff to F6

- Orders/Returns query keys і DTO належать customer/guest commerce boundary та не повинні повторно використовуватися для supplier projections.
- Supplier workspace має використовувати supplier-safe OrderItem DTO без повного Order, customer identity або payment metadata.
- G2/G5 закриті: workspace bootstrap використовує current membership endpoint, а Listing create/edit — supplier-scoped ProductVariant lookup.
- Зберегти backend authority, non-disclosing ownership errors і відсутність owner identifiers у browser storage.

## Milestone F6 — Supplier Cabinet

### Goal

Реалізувати active-membership-scoped Listing, lifecycle, inventory та owned OrderItem workspace без customer/payment data leakage.

### Screens/routes

- `/supplier/[supplierId]/listings`, `/listings/new`, `/listings/[listingId]`.
- `/supplier/[supplierId]/inventory`.
- `/supplier/[supplierId]/order-items`, `/order-items/[orderItemId]`.

### Backend dependencies

- Supplier Cabinet endpoints і guards.
- G2: `GET /api/v1/me/supplier-membership` повертає `{ data: { status, supplier: { id, name, slug } } | null }`; endpoint вимагає session, але не створює synthetic Admin membership.
- G5 list: `GET /api/v1/suppliers/:supplierId/product-variants?q=&limit=&cursor=`; `q` шукає Product name/SKU/manufacturer/OEM, `limit` має діапазон `1–50`, cursor opaque і прив'язаний до query.
- G5 detail: `GET /api/v1/suppliers/:supplierId/product-variants/:productVariantId`; list/detail використовують `SessionAuthGuard`, `RolesGuard`, `SupplierOwnershipGuard`, active membership та explicit Admin bypass.
- ProductVariant DTO містить variant identifiers і мінімальні Product/Brand/Category projections; Listings, stock, supplier/customer/payment data не повертаються.

### Backend prerequisites implementation log

- Додано current Supplier membership boundary у `AuthModule` без зміни Better Auth session projection.
- Додано read-only ProductVariant discovery у `SupplierCabinetModule` з whitelist query validation, deterministic `Product.name ASC, sku ASC, id ASC` sorting і non-disclosing detail `404`.
- G2/G5 не потребували schema, migration, dependency або ProductVariant write API змін.
- Targeted validation passed: integration — 1 suite/3 tests; E2E — 1 suite/2 tests; API build passed; full API lint passed без errors, після усунення однієї test warning scoped lint пройшов без diagnostics.

### Components/features

- Supplier workspace shell, listing table/form, lifecycle actions/reasons, inventory editor, supplier-safe order-item table/detail.

### State/data ownership

- `supplierId` походить із verified membership response/route; Listing/inventory/OrderItems — server state; `inventoryVersion` з останнього response.

### Tasks

- [x] Bootstrap supplier workspace з active membership, не з user-entered `supplierId`.
- [x] Реалізувати ProductVariant lookup для Listing create/edit через погоджений endpoint.
- [x] Реалізувати listing filters/cursor/sorting і server-owned fields.
- [x] Реалізувати submit/pause/resume/archive та показ moderation outcome.
- [x] Реалізувати inventory update з `expectedVersion`.
- [x] При `409` refetch актуального listing, показати conflict і explicit retry.
- [x] Реалізувати supplier OrderItem projections без повного Order/customer/payment data.

### Definition of Done

- [x] Inactive/foreign SupplierUser не бачить workspace data; Admin bypass відповідає backend policy.
- [x] Listing form не приймає client-owned supplier/status/timestamp fields.
- [x] Non-ACTIVE listing state не трактується як public visibility.
- [x] Concurrent inventory edit не перезаписує новішу версію мовчки.
- [x] Supplier response UI не містить customer identity, address або payment metadata.

### Testing

- Membership/routing tests; listing form/lifecycle tests; E2E active/inactive/foreign/Admin, variant lookup, inventory 409 і owned OrderItems.

### Validation

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

### Implementation log

- Додано membership-scoped `/supplier/[supplierId]` layout із SupplierUser ownership states, inactive/foreign denial та direct-route Admin mode без synthetic membership.
- Реалізовано Listings list/create/detail/edit, bounded filters/cursor navigation, lifecycle actions, moderation outcome та explicit non-ACTIVE visibility state.
- Реалізовано supplier-scoped ProductVariant remote lookup із cursor navigation та detail validation, inventory update з authoritative `inventoryVersion` і `409 → invalidate/refetch detail/list → explicit retry` UX.
- Реалізовано supplier-only OrderItem list/detail із allowlisted filters, cursor navigation та DTO, який не містить customer, address, payment або full Order data.
- Додано role-aware Supplier entry у header; session, membership, supplier resources і inventory залишаються TanStack Query server state без browser storage.

#### Validation results

- Targeted F6 tests — passed: 5 files, 6 tests; lifecycle/error mapping, paged ProductVariant validation/partial PATCH, inventory conflict/refetch/retry, supplier-safe OrderItem projection, inactive і foreign membership states.
- `pnpm --filter web lint` — passed, 0 warnings.
- `pnpm --filter web check-types` — passed; Next route types generated successfully.
- Full web suite, production build і Playwright E2E не запускалися відповідно до обмеженої F6 strategy.

#### Deferred E2E scenarios for F8

- SupplierUser automatic workspace navigation через G2, inactive/foreign denial і direct-route Admin bypass.
- ProductVariant search/detail, Listing create/edit та submit/approve/pause/resume/archive із public ACTIVE-only regression.
- Два конкурентні stock writers і supplier-versus-checkout race: `409`, refetch, актуальний version і контрольований retry.
- Supplier OrderItem filters/cursor/detail для multi-supplier Order без customer/address/payment leakage.

### Handoff to F7

- Supplier query keys, DTO та workspace routes належать supplier boundary; Internal Ops не повинні повторно використовувати supplier-safe OrderItem projection як global Order DTO.
- F7 зберігає centralized backend RBAC/policies, non-disclosing errors і окремі internal Notes/ActivityLog contracts.
- Admin Supplier bypass залишається direct-route capability; це не заміна Admin moderation queue або Supplier directory.

## Milestone F7 — Internal OMS, Returns, Notes, Audit and Moderation

### Goal

Побудувати role-aware operational workspaces для SupportManager/Admin поверх централізованих backend policies без витоку internal data у public/customer/supplier UI.

### Screens/routes

- `/internal/orders`, `/internal/orders/[orderId]`.
- `/internal/returns`, `/internal/returns/[returnRequestId]`.
- Notes panels на allowed Order/Return screens.
- `/internal/activity`.
- `/admin/moderation`.

### Backend dependencies

- Internal OMS, Returns, Notes, ActivityLog і Admin moderation endpoints.

### Components/features

- Filterable cursor queues, internal detail projections, transition dialogs, append/correct/redact notes, scoped audit table, moderation actions.

### State/data ownership

- Queues/resources — server state; filters/cursor — URL; transition/note drafts — local form state; policies — backend response/error authority.

### Tasks

- [x] Реалізувати Support/Admin Order queue, detail і allowed operational transitions.
- [x] Не додавати payment-state controls; webhook лишається authority.
- [x] Реалізувати Returns queue/detail і centralized transition actions.
- [x] Реалізувати internal-only Notes, corrections і Admin redaction tombstones.
- [x] Реалізувати scoped ActivityLog для Support і global read-only view для Admin.
- [x] Реалізувати Admin-only moderation queue, approve/reject/emergency pause.
- [x] Показати supplier-visible moderation reason окремо від internal audit metadata.

### Definition of Done

- [x] Customer/SupplierUser не можуть render/fetch internal resources через UI, а backend denial обробляється коректно.
- [x] SupportManager не отримує implicit moderation access.
- [x] Invalid/terminal transitions не оновлюються optimistic і показують policy error.
- [x] Note text/addresses/payment payload/secrets не потрапляють в audit metadata UI.
- [x] Після reject/pause public Catalog cache invalidated; повторне читання використовує backend `ACTIVE`-only contract.

### Testing

- Role/access and transition mapping tests; component tests для queue/notes/moderation states; E2E Support/Admin/denied flows і public visibility regression.

### Validation

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

### Implementation log

- Додано role-aware `/internal/*` workspace для активних SupportManager/Admin та окрему Admin-only `/admin/moderation` boundary; Customer, SupplierUser, inactive й anonymous sessions не render-ять internal children.
- Реалізовано OMS Order/Return queues і details з allowlisted URL filters, bounded cursor navigation та backend-controlled non-payment transitions без optimistic status updates.
- Реалізовано append-only Notes, corrections, Admin redaction tombstones і ActivityLog views: Support читає лише Order/Return scope, Admin має global read-only view, а frontend contract приймає тільки safe metadata `noteId`/`correctsNoteId`.
- Реалізовано Admin moderation approve/reject/emergency pause; destructive reject/pause вимагають explicit confirmation і supplier-visible reason, після чого invalidated moderation, Supplier Listing, ActivityLog і public Catalog cache boundaries.

#### Validation results

- Targeted F7 tests — passed: 5 files, 6 tests; operational/terminal transition mapping і required reject reason, OMS resource/all-timeline/ActivityLog invalidation, ActivityLog metadata privacy allowlist, Support/Customer access boundary, Admin note redaction tombstone та moderation reject/refetch/public cache invalidation.
- `pnpm --filter web lint` — passed, 0 warnings.
- `pnpm --filter web check-types` — passed; Next route types generated successfully.
- `git diff --check` — passed; Windows повідомив лише informational LF→CRLF warnings для наявних tracked files.
- Full web suite, production build і Playwright E2E не запускалися відповідно до обмеженої F7 strategy.

#### Deferred E2E scenarios for F8

- SupportManager/Admin session routing, Customer/SupplierUser/inactive denial і прямий запит до internal API з backend `401/403/404` handling.
- Повний OMS lifecycle `PAID → PROCESSING → SHIPPED → DELIVERED` без payment-state controls та з узгодженими timeline/ActivityLog подіями.
- Customer ReturnRequest → Support transition queue → Notes correction/redaction → scoped ActivityLog без витоку note body, address або payment payload.
- Admin approve/reject/emergency pause → Supplier бачить moderation reason → Catalog/PDP/Cart повторно підтверджують `ACTIVE`-only visibility.

### Handoff to F8

- Internal Ops server state ізольований власними query-key roots; F8 має перевірити cache cleanup/cross-role navigation при зміні session і відсутність cross-role internal data.
- Public visibility після moderation покладається на централізований backend `ACTIVE` predicate та prefix invalidation `queryKeys.catalog.root`; повний browser regression залишається readiness сценарієм.
- Notes/ActivityLog DTO є internal-only, а metadata frontend allowlist навмисно fail-closed при неузгодженому розширенні backend contract.

## Milestone F8 — Frontend readiness gate

### Goal

Підтвердити відтворюваність, contract alignment, accessibility, performance і повний role-aware frontend lifecycle перед deployment work.

### Screens/routes

- Усі routes F1–F7.

### Backend dependencies

- Blocking gaps G1–G5 закриті або явно виключені з release scope.
- Guarded test database і deterministic E2E fixture workflow доступні.

### Components/features

- Global navigation/error boundaries, cross-domain regression, accessibility/performance reports, deployment handoff.

### State/data ownership

- Audit усіх cache/query/storage boundaries; відсутність secret/token persistence і cross-role cache leakage.

### Tasks

- [x] Пройти clean install/build rehearsal для monorepo.
- [x] Пройти critical E2E flows Customer, Guest, SupplierUser, SupportManager, Admin.
- [x] Перевірити auth/cart cookies у local production-like topology.
- [x] Провести route/DTO/error audit проти фактичних backend controllers і E2E tests.
- [ ] Виконати exhaustive loading/empty/error/403/404/409/503 перевірку на кожному data screen.
- [x] Перевірити agreed representative loading/empty/error і `401`/`403`/`404`/`409`/`503` matrix у contract-critical flows; exhaustive Cartesian coverage прийнято як непропорційну для цього gate.
- [ ] Провести keyboard, screen-reader semantics, contrast і fitment status audit.
- [x] Зафіксувати та виміряти Lighthouse/performance budgets, усунути підтверджені waterfalls/CLS і документувати погоджений local simulated-performance exception.
- [x] Оновити README/architecture/context лише за фактичним станом.

### Definition of Done

- [x] Усі included frontend domains проходять contract і role/ownership E2E scenarios.
- [x] Немає sensitive data в localStorage, logs, serialized RSC props або public caches.
- [x] Stripe success/cancel не змінює payment state й коректно відображає pending webhook state.
- [x] Inventory conflict проходить refetch/retry UX.
- [x] Fitment outcomes не містять false-positive claims.
- [x] Build, lint, types, tests, automated accessibility і repository diff gates успішні.

### Testing

- Full frontend unit/component/E2E regression; selected backend contract suites; manual accessibility and production-topology smoke.

### Validation

```bash
pnpm lint
pnpm check-types
pnpm build
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web test:a11y --reuse-build
pnpm --filter web test:lighthouse --reuse-build --grep "on home$"
pnpm --filter api test:int
pnpm --filter api test:e2e
git diff --check
```

### Бюджети продуктивності та доступності

- Цільові показники Lighthouse у мобільному середовищі, наближеному до бойового: Performance `>= 80`, Accessibility `>= 95`, Best Practices `>= 90`.
- Цільові значення Core Web Vitals на 75-му процентилі: LCP `<= 2.5 s`, INP `<= 200 ms`, CLS `<= 0.1`.
- Публічні Catalog/PDP повинні зберігати обмежену серверну пагінацію, не фільтрувати весь каталог у браузері та не виконувати послідовно незалежні запити, які можна безпечно запускати паралельно.
- Кожен екран із даними повинен мати семантичні орієнтири, повну клавіатурну навігацію, видимий фокус, підписані елементи керування, озвучення асинхронних результатів і підтримку `prefers-reduced-motion`.
- Бюджети виміряні локальним трипрохідним Lighthouse gate. Simulated-mobile Performance/LCP не досягли цільових порогів; користувач погодив documented exception на підставі окремого Chrome-аудиту з Performance `75–78`. Для зміни статусу F8 на `Ready` ще потрібні ручна перевірка screen reader/responsive/contrast і завершені external Google OAuth та Stripe webhook checklists.

### Журнал реалізації

- Поточний статус готовності: умовно готовий (`Conditional`).
- Перевірка чистого встановлення та збірки: `pnpm install --frozen-lockfile`, кореневі lint, typecheck і build завершилися успішно; `pnpm-lock.yaml` після встановлення не змінився.
- Регресійна перевірка: повний набір Vitest для frontend, інтеграційні та E2E-тести API, а також Playwright-тести frontend успішно пройшли в захищеному локальному середовищі. Перший паралельний запуск Vitest отримав шість 5-секундних timeout через конкуренцію за ресурси; усі шість тестів пройшли послідовно, а повторний стандартний запуск завершився успішно без збільшення timeout або зміни кількості робочих процесів.
- Виправлення F8: після успішного входу очищаються всі попередні дані TanStack Query до завантаження нової безпечної проєкції сесії; таблиця Supplier OrderItems отримала доступний `caption`; регресійні перевірки підтверджують очищення кешу, відсутність token у frontend-сесії та доступну назву таблиці.
- Аудит репозиторію: session, guest, order і payment tokens не зберігаються у сховищі браузера; frontend runtime не посилається на бойові секрети; DTO для різних власників і ролей залишаються розділеними; sign-out очищає всі запити. Backend E2E-тести покривають нерозкривальну перевірку ownership, RBAC, inventory `409`, повноваження webhook, приватність Notes/ActivityLog та видимість результатів Admin moderation.
- Документація: кореневий README, README frontend-застосунку, `CONTEXT.md` та `ARCHITECTURE.md` описують реалізовані межі F0–F7, same-origin rewrite, захист тестової бази даних і поточне браузерне покриття.

#### Завершені автоматизовані перевірки (Automated checks completed)

- Додано Playwright fixtures для anonymous, Customer, Guest, active/inactive SupplierUser, SupportManager та Admin. Вони використовують реальні server-issued Better Auth/guest cookies, випадкові runtime-only паролі та scoped cleanup виключно в guarded `auto_parts_test`.
- Targeted role-aware Playwright smoke пройшов `3/3`: anonymous/Guest, Customer/Supplier membership та ownership, SupportManager/Admin boundaries, нерозкривальний missing-resource state, sign-out і порожнє browser storage.
- Targeted accessibility regressions для Admin moderation та Note redaction пройшли `2/2`: disclosure state має `aria-expanded`, а focus переходить у поле destructive confirmation.
- Targeted cache-isolation regression підтвердив, що sign-out видаляє role-bound TanStack Query data до встановлення anonymous session state.
- Static audit не виявив unbounded polling/rendering, browser token persistence, query-key collision або відсутньої cursor pagination у перевірених F6/F7 flows. Checkout polling обмежений 30 секундами, moderation mutation позначає public Catalog cache stale.
- Playwright runner підтримує запуск одного spec, явно будує API/frontend і запускає compiled API entry point; timeout readiness не збільшувався.
- Додано guarded domain fixture та шість mutation-oriented Playwright-сценаріїв для F2–F7: Garage/active fitment, Guest Cart persistence, checkout redirect recovery, Customer Return create/cancel, Listing submit та inventory `409` retry, Internal OMS/Return/Note і Admin moderation/public visibility. Combined targeted run пройшов `6/6`; cleanup audit після run підтвердив `0` залишкових F8 users/products/vehicles/notes/suppliers.
- Для локальних повторних targeted запусків runner підтримує явний `--reuse-build`; звичайний `test:e2e` як і раніше виконує guarded migration та API/web production builds. Прапорець використано лише після успішного build rehearsal у тому самому validation cycle.
- Lighthouse CI виконує три запуски на маршрут, обчислює медіанні metrics і дозволяє окремо перевіряти Home, Catalog, PDP, Supplier Listings та Internal Orders через Playwright `--grep`. Authenticated reports перевіряються на відсутність session-cookie values.
- Representative error-state matrix покрита так: `401` — auth/session regression; `403` — Customer/Supplier та SupportManager/Admin boundaries; non-disclosing `404` — foreign Supplier/Listing і Order projection; `409` — inventory refetch/retry; `503` — Checkout і ProductVariant unavailable presentation.

#### Ручні перевірки, які має виконати користувач (Manual checks required from user)

Результат слід позначити в колонці `Evidence` як `PASS` або `FAIL` із browser/viewport і коротким несекретним описом.

| Route / роль                                        | Дія                                                              | Очікуваний результат                                                  | Evidence |
| --------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| `/`, Anonymous                                      | Пройти header і skip-link лише клавіатурою                       | Видимий focus; skip-link переводить focus до `main`                   | Pending  |
| `/catalog`, Guest, 375 px і 200% zoom               | Відкрити/змінити filters і sort                                  | Контроли не перекриваються; labels і результати читаються             | Pending  |
| PDP, Customer                                       | Змінити vehicle context і прочитати fitment status screen reader | Status, причина та CTA озвучуються без залежності лише від кольору    | Pending  |
| `/cart`, Guest                                      | Відкрити drawer, змінити quantity, закрити Escape                | Focus утримується в dialog і повертається до trigger                  | Pending  |
| Supplier Listing create/detail, active SupplierUser | Викликати validation і пройти actions клавіатурою                | Error пов'язаний із field; pending/status повідомлення озвучуються    | Pending  |
| `/internal/orders`, SupportManager                  | Пройти filters/table на mobile/tablet/desktop                    | Немає overlap; scroll region доступний клавіатурі й має назву         | Pending  |
| `/admin/moderation`, Admin                          | Відкрити і скасувати destructive dialog                          | Initial focus безпечний; Escape працює; focus повертається до trigger | Pending  |
| Усі representative routes                           | Увімкнути reduced motion і перевірити contrast/status badges     | Немає обов'язкової анімації; текст і status залишаються зрозумілими   | Pending  |

##### Google OAuth checklist

| Крок                                                         | Очікуваний результат                                               | Evidence |
| ------------------------------------------------------------ | ------------------------------------------------------------------ | -------- |
| Перевірити local/staging origin і точний Google redirect URI | URI збігається з environment; secret не потрапляє в browser bundle | Pending  |
| Запустити реальний Google sign-in                            | Callback повертає користувача лише на safe `returnTo`              | Pending  |
| Оновити сторінку після callback                              | Server-issued session відновлюється без browser-storage token      | Pending  |
| Виконати sign-out і Back/refresh                             | Protected data більше не відображаються; cache очищений            | Pending  |

Не записувати й не передавати OAuth code, access token, cookie, client secret або повну callback URL із sensitive query.

##### Stripe CLI/webhook checklist

| Крок                                                               | Очікуваний результат                                                                              | Evidence |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------- |
| Користувач запускає Stripe CLI forwarding до local/staging webhook | API отримує signed test event; signing secret залишається лише в environment                      | Pending  |
| Створити Checkout attempt і завершити sanctioned test payment      | До webhook Order залишається `PENDING_PAYMENT`                                                    | Pending  |
| Дочекатися received/verified webhook і оновити success page        | Лише після webhook Order переходить у `PAID`                                                      | Pending  |
| Повторити delayed event/retry і cancel flow                        | Polling дозволяє manual retry; duplicate event не дублює transition; cancel не підтверджує оплату | Pending  |

Не записувати й не передавати Stripe secret/signing keys, session URL із sensitive parameters, webhook payload або customer data.

#### Результати перевірки

- `pnpm install --frozen-lockfile` — успішно виконано локально; lockfile не змінився.
- `pnpm lint` — успішно; поведінково нейтральний результат API `--fix` перевірено й вилучено з робочих змін F8.
- `pnpm check-types` — успішно.
- `pnpm build` — успішно, підтверджено користувачем.
- `pnpm --filter web test` — повторний стандартний запуск успішний, підтверджено користувачем: `36/36` test files і `76/76` tests.
- `pnpm --filter api test:int` — успішно, підтверджено користувачем.
- `pnpm --filter api test:e2e` — успішно, підтверджено користувачем.
- `pnpm --filter web test:e2e` — product regression успішний після додавання guarded role-aware fixtures; перевіряє оболонку застосунку, same-origin cookie transport, auth lifecycle, role boundaries, accessibility smoke і critical mutations. Lighthouse навмисно запускається окремим measured gate, тому погоджений performance exception не приховує metrics і не робить product regression червоним.
- `pnpm --filter web test:e2e -- role-aware-access.e2e-spec.ts` — успішно після локальних test-infrastructure fixes; API/frontend production builds пройшли, role-aware browser smoke `3/3`.
- `pnpm --filter web test:e2e -- --reuse-build critical-mutations.e2e-spec.ts` — успішно: combined deterministic mutation slice `6/6` пройшов за 1.3 хвилини після успішного guarded migration/API/web build rehearsal.
- Точкові регресійні тести F8 — успішно: ізоляція cache між сесіями, безпечна проєкція session та доступна назва supplier-таблиці.
- Точкові F8 accessibility-тести — успішно: Admin moderation і Note redaction `2/2`.
- `pnpm --filter web test:a11y --reuse-build` — успішно: `3/3` Playwright tests, вісім representative rendered states, Axe WCAG A/AA violations не виявлено.
- Трипрохідний Lighthouse — виконано для п'яти representative routes. Медіани Turbopack build: Home `52 / 5.46 с`, Catalog `63 / 4.82 с`, PDP `59 / 4.76 с`, Supplier Listings `63 / 4.65 с`, Internal Orders `66 / 3.76 с` у форматі Performance/LCP; CLS — `0`, Accessibility і Best Practices — `96–100`. Окремий користувацький Chrome-аудит показав Performance `75–78`; local simulated-performance exception погоджено.
- `git diff --check` — успішно; Windows вивів лише інформаційні попередження LF→CRLF.

#### Відкладені E2E-сценарії

- Детермінований Playwright slice тепер автоматизує критичні F2–F7 mutations і role/ownership boundaries. Checkout browser test перевіряє ephemeral `Idempotency-Key`, redirect тільки на server-shaped URL та owner-protected `PENDING_PAYMENT` recovery через локальний route fixture; він навмисно не підміняє реальну Stripe signature/webhook перевірку.
- Google OAuth перевіряється лише до початку переходу на сторінку провайдера; callback, прив’язування акаунта і відновлення реальної сесії після повернення залишаються ручною перевіркою.
- Реальна мережа Stripe навмисно не використовується в автоматичних тестах. API webhook-тести працюють із перевіреними синтетичними fixtures; сценарій через Stripe CLI у середовищі, наближеному до бойового, залишається ручним.

#### Відомі обмеження

- Simulated-mobile Lighthouse Performance `52–66` і LCP `3.76–5.46 с` нижчі за початкові цілі. Trace вказує на спільний Next/React JavaScript bootup/TBT; глибоку оптимізацію RSC/client boundaries і bundle profiling перенесено до Production Foundation за погодженим exception.
- Перевірки адаптивності, клавіатурної навігації, screen reader і контрастності всіх role-aware робочих просторів залишаються ручними.
- Маршрути Supplier/Internal використовують клієнтські оболонки перевірки доступу для UX і backend guards як єдину межу безпеки. Через це можливий послідовний ланцюжок завантаження session → membership → запит екрана; оптимізувати його слід лише після вимірювань і без послаблення backend authorization.

#### Відкладена перевірка (Deferred validation)

- Повний manual accessibility/responsive audit ще не зафіксовано; automated Axe не підміняє screen-reader, 200% zoom, real-device і contrast review.
- Реальні Google OAuth callback/session recovery і Stripe CLI verified-webhook scenarios залишаються external checks. Синтетичні Playwright/Jest fixtures не видаються за перевірку провайдерів.

#### Блокери релізу та відповідальні

- QA/UX фронтенду: зафіксувати ручну accessibility/responsive перевірку для репрезентативних public, commerce, supplier та internal маршрутів. Відповідальний — користувач; доказ — route/role/browser/viewport і `PASS`/`FAIL` без sensitive data.
- Platform/Auth: завершити Google callback, refresh, safe `returnTo` і sign-out checklist у local/staging. Відповідальний — користувач; не передавати OAuth code, token, cookie або secret.
- Platform/Payments: завершити Stripe CLI Checkout/webhook/delay/cancel/retry checklist. Відповідальний — користувач; не передавати signing secret, secret key або customer data.

#### Фінальний статус релізу (Final release status)

- `Conditional`: build, lint, types, frontend/backend regression, role-aware Playwright, critical F2–F7 mutations, Axe, Lighthouse measurement і repository diff gate пройдені або формально переглянуті; local simulated-performance exception погоджено. До `Ready` бракує зафіксованих ручних accessibility/responsive та external Google/Stripe результатів.

### План завершення Milestone F8

1. [x] Розширити наявні guarded role-aware fixtures детермінованими domain records для критичних F2–F7 product lifecycle scenarios.
2. [x] Автоматизувати критичні браузерні сценарії: Garage/PDP fitment, Cart/Checkout recovery, Customer Returns, Supplier Listing/inventory та Internal Ops/moderation mutations.
3. [x] Доповнити наявні `401`/`403`/нерозкривальний `404`/cache-isolation перевірки representative inventory `409` і recoverable `503` coverage.
4. Виконати ручну перевірку клавіатурної навігації, screen reader, контрастності й адаптивності для репрезентативних маршрутів кожного домену доступу та зафіксувати результати.
5. [x] Запустити трипрохідний Lighthouse для production build на Home, Catalog, PDP, Supplier Listings та Internal Orders, порівняти результати з бюджетами й зафіксувати погоджений exception.
6. Провести ручний сценарій Google OAuth callback/прив’язування акаунта і Stripe CLI webhook flow без використання production credentials.
7. Повторити повний набір перевірок F8, оновити фактичні результати, закрити решту Tasks/DoD і змінити статус із `Conditional` на `Ready` лише після усунення всіх блокерів.

### Handoff до Production Foundation

- Перший рекомендований ticket: визначити production topology та CI quality gate для окремих Next.js, NestJS і PostgreSQL runtime boundaries.
- Передумови: завершити manual/external F8 evidence, обрати hosting і managed PostgreSQL, визначити ownership/rotation secrets та зберегти Lighthouse baseline для порівняння після deployment.
- Прочитати: `docs/ARCHITECTURE.md`, `docs/CONTEXT.md`, F8 у цьому документі, U6 у `docs/UI-UX-REDESIGN-PLAN.md`, а також фактичні root/web/api package scripts.
- Не змінювати без окремого плану: HttpOnly session/guest cookie semantics, backend RBAC/ownership, Stripe webhook authority, inventory concurrency, DTO privacy, Prisma schema/migrations та product lifecycle policies.
- Не включати в Production Foundation ticket нові product features: wishlist, reviews, promotions, VIN lookup, onboarding, shipping, payouts, email flows або analytics.

## Recommended implementation sequence

1. F0 — Frontend platform and contract gate.
2. F1 — Public shell and authentication.
3. F2 — Vehicle selector and Customer Garage.
4. F3 — Public Catalog, PDP and fitment UX.
5. F4 — Guest/Customer Cart and Stripe Checkout.
6. F5 — Customer/Guest Orders and Returns.
7. F6 — Supplier Cabinet.
8. F7 — Internal OMS, Returns, Notes, Audit and Moderation.
9. F8 — Frontend readiness gate.
