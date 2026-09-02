# UI/UX redesign plan — Auto Parts Marketplace

## Status

- Workstream: UI/UX redesign після функціональних Milestones F0–F8.
- Поточний етап: U0–U2 завершено; наступний погоджуваний slice — U3.
- Implementation status: U0–U2 — complete; U3–U6 — не розпочато.
- F8 залишається `Conditional`: фінальні accessibility, responsive, Lighthouse та external integration checks виконуються після redesign.

## Summary

Функціональні frontend-контракти вже покривають public storefront, Garage, commerce, Supplier Cabinet та Internal Ops. Поточний UI має добру семантичну основу, але візуально спирається переважно на нейтральний shadcn baseline: monochrome tokens, однакові bordered cards, текстові loading/empty states і майже повну відсутність змістовних media assets.

Redesign має надати платформі впізнаваний automotive-характер, зробити fitment і активний автомобіль центральними елементами shopping flow, а operational workspaces — щільними та швидкими для щоденної роботи. Backend залишається єдиним джерелом authorization, ownership, fitment, availability, inventory, payment і lifecycle state.

## Goal

- Створити цілісну й професійну visual language для automotive marketplace.
- Посилити vehicle-first discovery, fitment confidence і commercial hierarchy.
- Відокремити характер public storefront від Supplier/Internal workspaces.
- Уніфікувати typography, spacing, surfaces, status, forms, tables та async states.
- Ввести юридично безпечну image/media policy без вигаданих product claims.
- Зберегти WCAG 2.2 AA, responsive behavior, performance budgets і F0–F8 contracts.

## Non-goals

- Зміна backend API, Prisma schema, migrations, authentication або RBAC.
- Нові checkout, payment, fulfillment, shipping, rating чи review можливості.
- Вигадування product specifications, delivery promises, stock або fitment data.
- Supplier directory, global Returns screen або Guest self-service returns.
- Dark mode, новий image provider, CDN, font service чи animation library без окремого рішення.
- Копіювання чужих layout-композицій, trade dress, текстів, логотипів або фотографій.

## Context inspected

- `docs/FRONTEND-MILESTONES.md` — реалізовані F0–F8 contracts, gaps і readiness state.
- `apps/web/app/**` — public, customer, supplier, internal та admin routes.
- `apps/web/components/**` — domain screens, shadcn primitives і CSS Modules.
- `apps/web/app/globals.css` — current neutral theme tokens і dormant dark tokens.
- `apps/web/lib/**` — route/session/query boundaries і presentation mappings.
- `apps/web/public/**` — лише starter assets; automotive media відсутні.
- `apps/web/next.config.js` — API rewrite; image `remotePatterns` не налаштовані.
- `apps/web/lib/catalog/catalog-types.ts` — Catalog/PDP DTO не містить image/media fields.
- `apps/web/package.json` і `apps/web/components.json` — Next.js 16, React 19, Tailwind 4, Base Nova, Lucide.

## Research boundaries

Публічні джерела використані лише для узагальнення UX patterns:

- [Baymard automotive parts research](https://baymard.com/research/automotive-parts) — vehicle-specific e-commerce, search, product lists, PDP і checkout themes.
- [Baymard automotive audit areas](https://baymard.com/audits/automotive-parts) — mobile filtering/sorting, product-list information scent і touch behavior.
- [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) — semantics, focus, forms, images, state та performance checks.
- [Next.js Image documentation](https://nextjs.org/docs/app/api-reference/components/image) — local assets, dimensions, lazy loading і strict `remotePatterns`.
- [Walmart Marketplace fitment overview](https://marketplacelearn.walmart.com/guides/Item%20setup/Automotive%20fitment/automotive-fitment-overview) — fitment як окремий vehicle-context contract.

Жоден конкретний дизайн, asset або branded composition не переноситься у продукт.

## Current strengths to preserve

- Root layout має `lang="uk"`, skip link і один semantic `main` на route.
- Forms переважно використовують native labels/controls, а tables — headings, scopes і captions.
- Fitment outcomes мають icon, label і explanation, тому не залежать лише від кольору.
- URL зберігає catalog/workspace filters і cursor state; server state належить TanStack Query.
- CSS Modules відокремлюють route/component styles від global tokens.
- Geist Sans/Mono завантажуються локально; SKU/OEM/IDs можна показувати моноширинно без нового dependency.
- Loading, empty, error, denied і conflict states функціонально існують.
- Cart, payment, moderation, lifecycle та role authority не дублюються у UI.

## Visual and UX audit

### Executive findings

| Priority | Finding                                                                                         | Evidence                                                                                                                   | Impact                                                                 | Resolution boundary                                               |
| -------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P0       | Neutral monochrome tokens не формують automotive identity                                       | `apps/web/app/globals.css:61`, `:67`, `:73`                                                                                | Storefront виглядає як generic starter                                 | Frontend tokens                                                   |
| P0       | Homepage є одним текстовим блоком із трьома links, без vehicle-first entry                      | `apps/web/app/page.tsx:8–18`; `page.module.css:4`                                                                          | Не пояснює головну перевагу marketplace                                | Frontend + existing taxonomy API                                  |
| P0       | Header не має active-route hierarchy, compact mobile navigation або чіткого workspace switch    | `app-header.tsx:49–98`; `app-header.module.css:108–121`                                                                    | Навігація перевантажується зі зростанням ролей                         | Frontend shell                                                    |
| P0       | Product і vehicle media відсутні                                                                | `ProductMedia.tsx:4–9`; `catalog-types.ts`; `public/**`                                                                    | Catalog/PDP/Garage не мають commercial credibility                     | Demo fallback frontend; real media API/content prerequisite       |
| P0       | Однакова bordered-card treatment використовується майже для всіх domains                        | `ProductCard.module.css:1–7`; `orders.module.css:37–52`; `supplier.module.css:117–130`; `internal-ops.module.css:84–91`    | Слабка surface hierarchy; storefront і back office виглядають однаково | Frontend design system                                            |
| P0       | User-facing copy розкриває implementation details                                               | `CartPage.tsx:8–12`; `OrdersPage.tsx:19–22`                                                                                | Знижує довіру та зрозумілість для покупця                              | Frontend copy only                                                |
| P0       | Status palette не централізована; частина operational badges лишається neutral                  | `FitmentBadge.module.css`; `orders.module.css:130–153`; `supplier.module.css:151–164`; `internal-ops.module.css:160–181`   | Статуси складно сканувати між domains                                  | Semantic status tokens                                            |
| P1       | Mobile catalog просто ставить filters над results                                               | `CatalogPage.module.css:136–145`                                                                                           | Довга форма відсуває products; немає compact applied-filter overview   | Frontend responsive composition                                   |
| P1       | Catalog product cards мають мінімум інформаційної ієрархії та однаковий placeholder             | `ProductCard.tsx:15–31`                                                                                                    | Складніше порівнювати products/offers                                  | Frontend; real images blocked by G8                               |
| P1       | PDP розподіляє CTA між nested variant/offer cards                                               | `ProductDetailContent.tsx:17–56`; `ListingOfferList.tsx`                                                                   | Fitment, ціна, availability і CTA не утворюють єдиного decision path   | Frontend composition                                              |
| P1       | Supplier listing/inventory screens використовують card lists там, де потрібне швидке порівняння | `SupplierListingsScreen.tsx`; `SupplierInventoryScreen.tsx`; `supplier.module.css:117–130`                                 | Низька information density на desktop                                  | Responsive table/list pattern                                     |
| P1       | Internal tables мають horizontal scroll, але без sticky headings/priority columns               | `internal-ops.module.css:129–151`                                                                                          | Складне сканування довгих queues                                       | Frontend table primitive                                          |
| P1       | Mixed product/developer vocabulary у customer та operator copy                                  | `SupplierListingForm.tsx:113`; `SupplierListingsScreen.tsx:107`; `InternalOrdersScreen.tsx:55`; `ActivityLogScreen.tsx:48` | Інтерфейс виглядає технічним прототипом                                | Copy dictionary; exact IDs/status codes залишити там, де потрібні |
| P1       | Loading states часто є лише одним рядком тексту                                                 | Garage, Orders, Supplier, Internal screens                                                                                 | Layout shift і слабке perceived performance                            | Skeleton/state primitives                                         |
| P1       | Global `overflow-x: hidden` може маскувати локальні overflow defects                            | `apps/web/app/globals.css:10`                                                                                              | Ускладнює responsive QA                                                | Audit per component before removal                                |
| P2       | `.dark` tokens існують, але product не має погодженого theme behavior                           | `apps/web/app/globals.css:95`                                                                                              | Може створити випадковий scope creep                                   | Залишити dormant; не реалізовувати toggle                         |

### 1. Public storefront

#### Header and navigation

- Замінити текстовий brand label компактним typographic wordmark, створеним у CSS/HTML без нового logo asset на U0.
- Desktop: primary shopping navigation, vehicle context, cart і account/workspace actions мають бути окремими zones.
- Mobile: menu trigger + search/cart/account shortcuts із target size не менше 44 px; Sheet має title, focus trap і `overscroll-behavior: contain`.
- Позначати active route через `aria-current="page"` і візуальний state.
- Supplier/Internal navigation не змішувати з public shopping links: показувати один role-aware workspace entry.

#### Homepage

- Головний job: користувач обирає автомобіль або переходить до пошуку деталі.
- Hero: asymmetric two-column composition із vehicle selector у “Fitment Rail”, а не декоративний SaaS gradient.
- Нижче: category navigation, “як працює fitment”, commercial trust statements, останній active vehicle context.
- Не вигадувати reviews, delivery speed, warranty, SKU count або partner logos без даних.
- Category tiles можуть використовувати тільки погоджені local licensed/generated visuals.

#### Vehicle selector and Garage context

- Перетворити Year → Make → Model → Generation → Engine на видиму послідовність із current/completed/disabled states.
- На mobile залишити native selects або accessible combobox; не приховувати labels у placeholders.
- Active vehicle має бути persistent contextual strip на Home/Catalog/PDP, але не глобальним client authority.
- Garage card: neutral silhouette + make/model/year/engine text; generic silhouette не видавати за точну модель.

#### Catalog

- Desktop: sticky filter column, compact results toolbar, applied-filter chips і 3-column grid за наявної ширини.
- Mobile: Filters у Sheet/Drawer; у main flow залишаються search, sort, result count та applied filters.
- Product card hierarchy: media → brand/category → product name → price range → offer count → primary detail action.
- Card не повинен мати кілька конкуруючих click targets; ціна й availability не обчислюються frontend.
- Pagination лишається server-bounded; не переходити до endless scrolling.

#### PDP and fitment

- Desktop: media/summary column + sticky commercial decision column; на mobile CTA розташовується після fitment/offer context.
- Fitment Rail має показувати selected vehicle, один із 4 status outcomes і reason explanation.
- `unknown` та `caution` не оформлювати як слабший success.
- SKU, MPN, OEM мають окремий compact technical specification block.
- Supplier offers порівнюються рядками: supplier, condition, availability, price, CTA.
- Реальну gallery не проєктувати як готову функцію до media contract; demo fallback лишається чесним.

#### Cart, checkout, Orders and Returns

- Прибрати з customer copy терміни `HttpOnly`, `server-authoritative`, `browser storage`, `webhook`.
- Cart: product snapshot, supplier, quantity, issue, line total; summary/checkout CTA мають бути візуально домінантними.
- Checkout return: status stepper `Створено → Перевіряємо оплату → Підтверджено` без локального переходу в paid.
- Orders: компактні order summaries із date/status/total/items; detail з immutable snapshot і timeline.
- Returns: eligibility, current lifecycle та available action відокремити від товарної картки, але не створювати `/returns` без G6.

### 2. Supplier workspace

- Окремий workspace chrome: sidebar на desktop, compact Sheet navigation на mobile, supplier identity й active membership state.
- Listings: responsive table на desktop, condensed rows/cards на mobile; status, SKU, price, stock та updated time мають скануватися в одному рядку.
- Listing create/edit: секції `Product`, `Offer`, `Publication`; ProductVariant search — combobox/listbox composition із current selection.
- Lifecycle actions групувати за intent: primary next action, secondary operational actions, destructive archive окремо.
- Inventory: inline numeric editor із current version, conflict callout і explicit refetch/retry path.
- Supplier OrderItems: high-density table без customer/payment/internal fields; horizontal overflow не повинен бути єдиною mobile strategy.
- Admin direct supplier view має чіткий non-membership banner, але не змінює backend bypass policy.

### 3. Internal workspace

- Візуально відрізнити від storefront: cool-gray canvas, compact sidebar, sticky toolbar, dense tables, minimal decorative media.
- Orders/Returns/Moderation queues: sticky headings, tabular numbers, compact status filters, saved URL state і clear results count.
- Detail screens: summary rail, immutable data sections, timeline та role-allowed actions.
- Transition dialogs: explicit current → next status, reason requirements, destructive emphasis і focus restoration.
- Notes: append-only timeline; correction relation видима, redaction показується tombstone без прихованого body.
- ActivityLog: technical codes залишаються, але IDs мають copy affordance і predictable monospace treatment.
- SupportManager та Admin actions мають бути візуально різними; frontend не додає implicit permission.

### 4. Authentication and cross-cutting states

- Auth layout може мати restrained technical illustration, але form лишається основним landmark.
- Створити спільні `StatePanel` variants: loading, empty, error, denied, conflict, unavailable.
- Error copy: проблема + наступний крок; не показувати transport/internal terminology.
- Skeletons повторюють фінальну геометрію і не анімуються при reduced motion.
- Destructive actions використовують AlertDialog/Dialog або наявне accessible inline confirmation з focus restoration.

## Recommended design direction

### Direction: “Precision Workshop”

Marketplace виглядає як сучасний цифровий інструмент для точного підбору деталей: світлий technical canvas, graphite structure, restrained signal-orange commercial accent і семантичні fitment/status colors. Візуальна мова походить від parts labels, inspection marks, specification plates і workshop organization, але не імітує dashboard автомобіля буквально.

### Signature element: Fitment Rail

Один впізнаваний елемент платформи — горизонтальна/stacked contextual rail:

```text
┌ VEHICLE ──────────────────────────────────────────────┐
│ 2018  Volkswagen  Golf VII  1.6 TDI   [Active] [Edit]│
└───────────────────────────────────────────────────────┘
                  ↓
       [Compatible ✓] Exact engine match
```

Він повторюється на Home, Catalog і PDP, але завжди читає backend/Garage state. На mobile rail стає дворядковим і не створює horizontal scroll.

### Color system proposal

Точні contrast ratios перевіряються в U0 до застосування.

| Token role   | Proposed value | Purpose                            |
| ------------ | -------------- | ---------------------------------- |
| Canvas       | `#F4F5F6`      | Public/workspace background        |
| Surface      | `#FFFFFF`      | Primary reading surface            |
| Graphite     | `#172033`      | Primary text/navigation            |
| Steel        | `#D8DEE6`      | Borders/dividers                   |
| Signal       | `#C2410C`      | Primary commerce CTA/active marker |
| Info         | `#175CD3`      | Informational state/links          |
| Compatible   | `#166534`      | Confirmed fitment/success          |
| Caution      | `#92400E`      | Conditional fitment/warning        |
| Incompatible | `#B42318`      | Incompatible/destructive/error     |

- Signal orange не використовується для destructive actions.
- Status завжди має text/icon/shape, а не лише color.
- Operational workspace використовує ті самі semantic tokens, але щільніші spacing/surface правила.

### Typography

- Body/UI: наявний local Geist Sans, base 16 px, line-height 1.5–1.65.
- Headings: Geist Sans із більш вузьким max-width, weight/letter-spacing scale; жодного external font на U0.
- SKU/OEM/MPN/IDs/numeric columns: Geist Mono з tabular numerals.
- Optional distinctive display font — лише local licensed asset після окремого approval.
- Не використовувати monospace для body copy або всього storefront.

### Shape, spacing and motion

- Spacing: 4 px base; primary steps `4/8/12/16/24/32/48/64`.
- Radius: `4 px` controls/data, `8 px` standard surfaces, `12 px` featured storefront areas; не робити все pill/card.
- Dividers, background bands і whitespace використовувати частіше за nested cards.
- Motion: 120–180 ms для hover/focus/open state, лише opacity/transform; без parallax, scroll choreography чи нового library.
- `prefers-reduced-motion` зберігає фінальний state без decorative movement.

## Design-system architecture

### Global tokens

У `globals.css` залишаються тільки:

- semantic color/radius/typography/elevation tokens;
- reset/base/focus/reduced-motion rules;
- global container та visually-hidden utilities, якщо вони справді shared.

Component-specific styles залишаються в CSS Modules.

### Reusable primitives to evaluate in U0

- `PageHeader` / `WorkspaceHeader` — explicit variants, не набір boolean props.
- `FitmentRail` — composition із VehicleSummary, FitmentState та Actions.
- `StatusBadge` — shared semantic tones, domain labels залишаються у presentation mappings.
- `StatePanel` — Loading, Empty, Error, Denied, Conflict, Unavailable variants.
- `DataToolbar` — filters, applied state, count, sorting.
- `ResponsiveDataView` — semantic table на desktop і explicit mobile row composition.
- `Money`, `TechnicalId`, `MetaList` — стабільна typography/data formatting.
- `MediaFrame` — ratio, fallback, loading і alt policy без припущення про URL source.

Не створювати універсальний “mega component”. Public і operational variants мають бути explicit compositions.

## Image and media strategy

### Current contract

- Catalog/PDP DTO не містить image URLs.
- Vehicle/Garage DTO не містить vehicle image.
- Category filter-options повертає лише `id` і `name`.
- `next.config.js` не має `images.remotePatterns`.
- `public/` не містить automotive assets.

Тому real product/vehicle media є content/backend prerequisite, а не styling task.

### Phase A — safe local presentation assets

Після окремого approval зберігати assets у:

```text
apps/web/public/images/
├─ categories/
├─ placeholders/
└─ vehicles/
```

- Category visuals: власні generated/licensed editorial illustrations, WebP/AVIF, ratio `3:2`.
- Product fallback: neutral technical placeholder, ratio `4:3`; не використовувати category illustration як нібито фото конкретного товару.
- Vehicle fallback: generic side-profile silhouette, ratio `16:9`; adjacent vehicle text є source of truth.
- Brand logos не додавати без trademark/content policy.
- SVG використовувати для silhouettes/icons, raster AVIF/WebP — для photographic/editorial assets.

### Phase B — real product media prerequisite

Потрібен окремий backend/content contract:

- stable media ID/URL;
- product/variant/listing ownership рівень;
- ordering і primary image;
- width/height або aspect ratio metadata;
- alt/content description policy;
- lifecycle, moderation і broken-image fallback.

До цього `ProductMedia` не приймає synthetic remote URL.

### Remote provider policy

External provider можливий лише після approval, license review і caching/privacy decision. Тоді:

- додати максимально вузький `next/image` `remotePatterns` за protocol/hostname/path;
- передавати explicit dimensions або `fill` у reserved aspect-ratio frame;
- priority лише для LCP image; below-fold — lazy loading;
- не дозволяти wildcard provider domains без path restriction;
- не передавати private/authenticated image URLs через default optimizer.

### Alt and fallback policy

| Media                       | Alt rule                                                         | Fallback                               |
| --------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| Category tile               | `alt=""`, якщо поруч є та сама category label і image decorative | Category-specific neutral illustration |
| Real product image          | Назва/brand + фактичний view; без keyword stuffing               | Honest “Зображення відсутнє” frame     |
| Generic product placeholder | Decorative icon `aria-hidden`; visible fallback text             | Same reserved `4:3` frame              |
| Generic vehicle silhouette  | `alt=""`; make/model/year передаються сусіднім текстом           | Neutral silhouette, не “точне фото”    |
| Future exact vehicle image  | Make/model/generation, лише якщо source reliable                 | Generic silhouette                     |

## Responsive strategy

| Width         | Storefront                                                | Supplier/Internal                                      |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `>= 1200 px`  | Wide catalog, sticky filters/decision panel               | Sidebar + dense tables + sticky toolbar                |
| `768–1199 px` | 2-column catalog, compact header                          | Collapsible sidebar, reduced columns                   |
| `< 768 px`    | Search-first header, filter Sheet, single-column products | Sheet navigation, prioritized mobile rows              |
| `320–479 px`  | 44 px controls, no clipped IDs, stacked Fitment Rail      | No action-only hover, no inaccessible wide-only tables |

- Zoom 200% і text reflow перевіряються окремо.
- Horizontal scroll дозволений лише для data table wrapper із visible affordance; основна сторінка не маскує overflow глобально.
- Sticky elements не перекривають focused controls.

## Accessibility acceptance criteria

- WCAG 2.2 AA target; text contrast `>= 4.5:1`, UI/focus graphics `>= 3:1`.
- Native semantic controls, labels, landmarks і heading hierarchy зберігаються.
- Усі icon-only actions мають accessible name; decorative icons — `aria-hidden`.
- Visible focus, logical order, skip link і focus restoration після dialogs/destructive confirmations.
- Async mutation result — `aria-live="polite"`; blocking error — contextual `role="alert"` без надмірного announcement.
- Fitment/status не передається лише кольором.
- Target minimum WCAG — 24×24 px; commercial/mobile controls target — 44×44 px.
- 200% zoom, Windows High Contrast, reduced motion та keyboard-only flows входять у U6.
- Automated audit не вважається повною screen-reader перевіркою.

## Performance and Next.js constraints

- Не розширювати client component boundaries тільки заради presentation.
- Home/category presentation за можливості лишається Server Component; interactive selector — isolated client island.
- Не дублювати session/Garage/catalog fetch у parent і child components.
- Незалежні server reads починати паралельно; existing TanStack query keys не змінювати без contract reason.
- Reserve media dimensions, щоб CLS лишався `<= 0.1`.
- Не додавати hero video, carousel, animation або icon library.
- Cursor/pagination лишаються bounded; для таблиць до 50 rows virtualization не є prerequisite.
- Після кожного public slice перевіряти bundle/client boundary, а Lighthouse — після стабілізації UI.

## Priorities

### P0 — presentation baseline

1. Semantic design tokens і status system.
2. Public header/mobile navigation та role-aware workspace entry.
3. Vehicle-first homepage + Fitment Rail.
4. Catalog/PDP hierarchy та чесна media fallback policy.
5. Shared loading/empty/error/denied/conflict states.
6. Supplier/Internal workspace chrome і readable dense tables.
7. Customer-facing copy без implementation terminology.

### P1 — domain polish

1. Category navigation з approved local assets.
2. Garage cards із generic vehicle silhouette.
3. Cart, checkout, Orders і Returns presentation.
4. Listing form, lifecycle actions та inventory conflict workflow.
5. Internal detail, transition dialog, Notes, ActivityLog і moderation density.
6. Responsive mobile rows, filter Sheets і sticky controls.

### P2 — content maturity

1. Real product media API/content pipeline.
2. Optional licensed local display font.
3. Brand asset policy.
4. Dark mode feasibility.
5. Measured microinteraction enhancements після Lighthouse/a11y baseline.

## Approval decisions required

| Decision             | Recommended default                    | Why approval is needed                             |
| -------------------- | -------------------------------------- | -------------------------------------------------- |
| Visual direction     | “Precision Workshop”                   | Визначає palette, density і signature Fitment Rail |
| Accent color         | Restrained signal orange               | Brand-level visual decision                        |
| Typography           | Retain local Geist Sans/Mono in U0     | Новий font потребує license/performance review     |
| Category assets      | Local generated/licensed illustrations | Потрібне content/license погодження                |
| Product media        | Honest local fallback until API exists | API/schema/content work поза redesign scope        |
| Vehicle media        | Generic local silhouette               | Не вводить в оману щодо exact model                |
| Workspace navigation | Sidebar desktop + Sheet mobile         | Найбільша structural UI change                     |
| Dark mode            | Deferred                               | Не входить до approved scope                       |

## Execution plan

### U0 — Design foundation and shell pilot

#### Goal

Перевірити direction на малому reversible slice без масового refactor.

#### Scope

- Оновити semantic tokens, typography/spacing/radius/status foundations.
- Створити мінімальні reusable `PageHeader`, `StatusBadge`, `StatePanel` compositions лише якщо existing patterns підтвердять reuse.
- Переробити public header та homepage як pilot.
- Зберегти existing routes/session behavior; vehicle selector використовує лише existing APIs.
- Assets: тільки approved placeholders/silhouette; без remote provider.

#### DoD

- Homepage має vehicle-first job і чіткий catalog fallback.
- Header працює keyboard/mobile та не змішує workspace/public navigation.
- Tokens проходять contrast checks.
- Немає нових dependencies, API changes або client-state authority.
- Targeted shell/home/auth tests, lint, typecheck і `git diff --check` проходять.

#### Implementation log

- У `globals.css` додано semantic foundation “Precision Workshop”: graphite/canvas/surface, signal-orange CTA, info/fitment/status colors, stronger control edge, shared storefront container, focus і reduced-motion rules. Dormant dark theme не активовано.
- Public header отримав HTML/CSS wordmark, active-route `aria-current`, окремі shopping/workspace zones та Base UI `Sheet` для mobile navigation. Session, sign-out, Cart, Supplier membership discovery і role routes залишилися без змін.
- Homepage перероблено як vehicle-first pilot: Garage є єдиним шляхом вибору/активації автомобіля, Catalog — явним fallback. Новий local vehicle state або непідтримувані Catalog query params не додавалися.
- Додано оригінальну generic vehicle illustration без логотипів і тексту. Asset збережено локально як WebP `1280×720` (приблизно 236 KB), використано декоративно з reserved dimensions.
- Homepage отримав Fitment Rail, compact catalog directions і factual trust strip без reviews, delivery promises або вигаданих product/media claims.

#### Validation results

- `pnpm --filter web test -- app/platform-shell.spec.tsx app/app-header.spec.tsx auth/auth-forms.spec.tsx` — passed, 3 files / 8 tests.
- `pnpm --filter web test -- app/app-header.spec.tsx` після mobile Sheet assertion — passed, 1 file / 2 tests.
- `pnpm --filter web lint` — passed.
- `pnpm --filter web check-types` — passed.
- `git diff --check` — passed.
- Static contrast check: graphite/canvas `14.90:1`, signal/white `5.18:1`, info/white `5.99:1`, compatible/white `7.13:1`, caution/white `7.09:1`, incompatible/white `6.57:1`, interactive input edge/canvas `3.26:1`.
- Full visual responsive, 200% zoom, screen-reader і Lighthouse validation залишаються частиною U6; automated U0 checks не видаються за повну manual accessibility перевірку.

#### U1 handoff

- Reuse global semantic tokens і storefront container; component-specific presentation залишається в CSS Modules.
- Підключити active Garage vehicle до real Fitment Rail через наявні query contracts, не створюючи client authority.
- Замінювати generic category directions на API-backed categories лише з фактичними IDs; не hardcode-ити filter query values.
- Product fallback залишається чесним до появи media contract. Category illustrations потребують окремого content/license approval.

### U1 — Vehicle, Catalog and PDP storefront

**Статус:** Complete. Vehicle/Garage, Catalog і PDP storefront оновлено без зміни F0–F8 behavior або backend contracts.

- [x] Fitment Rail у Home та Catalog використовує фактичний active Garage vehicle через наявні session/query contracts.
- [x] Vehicle Selector отримав видиму п’ятиетапну послідовність без зміни cascade/reset behavior.
- [x] Garage розділяє active vehicle і компактний список інших автомобілів; create/activate/delete mutations та ownership contract не змінено.
- [x] Catalog отримав toolbar, mobile filter Sheet, applied filters і нову product-card hierarchy.
- [x] Product media fallback залишається чесним за відсутності media contract.
- [x] Підключити Fitment Rail до PDP decision layout, посилити fitment hierarchy, technical identifiers та offers.
- [x] Виконати фінальний targeted F3 regression і static responsive/a11y smoke для завершення U1; повна ручна перевірка залишається у U6.

#### Garage media policy

- Garage використовує локальний нейтральний `vehicle-silhouette.svg` як декоративний fallback; він не заявляє точну марку, модель, покоління або тип кузова.
- Фактичним описом автомобіля залишаються лише server-provided Year, Make, Model, Generation та Engine.
- Повторне використання homepage hero media у Garage заборонено regression-тестом.
- Точні фотографії не визначаються на frontend за назвою моделі та не завантажуються зі сторонніх URL.
- Контрольований media contract для Vehicle Model або Vehicle Generation відкладено до окремого backend/content milestone. Після його появи frontend має використовувати точне media лише за явним DTO-полем, з neutral silhouette як fallback.

#### Implementation log

- Створено reusable Vehicle Context Rail для Home/Catalog із loading, empty, warning та active states без client-side fitment authority.
- Garage presentation перебудовано навколо окремої featured-картки active vehicle, compact saved rows і нижнього блоку додавання автомобіля.
- Додано оригінальний локальний нейтральний SVG silhouette без логотипів, торгових марок і claims щодо конкретного автомобіля.
- Catalog search/sort винесено в toolbar; desktop filters зроблено sticky, mobile filters — через наявний Base UI Sheet; додано applied-filter chips.
- Catalog cards показують лише фактичні Brand/Category/price/listing availability та чесний placeholder замість вигаданих product images.
- PDP перебудовано як decision surface: чесний media fallback, фактичний price/availability summary, anchor до пропозицій і пояснення, що конкретний Listing обирається нижче.
- PDP повторно використовує спільний Vehicle Context Rail; active vehicle не видається за підтвердження сумісності, а backend fitment status/reason залишається окремим для кожної ProductVariant.
- ProductVariant blocks отримали status-specific hierarchy, компактні SKU/MPN/OEM identifiers і responsive supplier-offer rows; Add to Cart як і раніше викликається лише з фактичним Listing id.
- Референсні зображення використано лише як структурний орієнтир: не додано wishlist, вигаданих характеристик, stock/delivery claims, товарних фотографій або нових media/API contracts.

#### Validation results

- `pnpm --filter web test -- test/vehicles/vehicle-selector.spec.tsx` — passed, 1 file / 1 test.
- `pnpm --filter web test -- test/garage/garage-workspace.spec.tsx` — passed, 1 file / 1 test; перевірено activate/refetch і neutral silhouette.
- `pnpm --filter web test -- test/catalog/catalog-page.spec.tsx` — passed, 1 file / 1 test.
- `pnpm --filter web test -- test/catalog/product-detail-page.spec.tsx` — passed, 1 file / 1 test; перевірено active vehicle toggle, всі fitment outcomes, media fallback і фактичний offer summary.
- `pnpm --filter web test -- test/vehicles/vehicle-selector.spec.tsx test/garage/garage-workspace.spec.tsx test/catalog/catalog-page.spec.tsx test/catalog/product-detail-page.spec.tsx test/catalog/fitment-presentation.spec.ts` — passed, 5 files / 5 tests.
- `pnpm --filter web check-types` — passed.
- Scoped ESLint для змінених Vehicle/Garage/Catalog/PDP TSX-файлів — passed; повний lint раніше не завершився у відведений короткий інтервал.
- `git diff --check` — passed; Windows LF → CRLF повідомлення є інформаційними.
- Static responsive/a11y review — passed: mobile-first single-column fallback, desktop decision layout, semantic headings/regions, visible focus, live vehicle/fitment status і touch-sized actions збережено.
- Manual responsive, keyboard, 200% zoom, screen-reader і Lighthouse validation для цілісного redesign залишається у фінальному U6 gate; automated/static U1 checks не видаються за повний manual audit.

### U2 — Customer commerce and account

**Статус:** Complete. Auth, Cart, checkout return, Orders і Returns оновлено без зміни F0–F8 behavior, API/query contracts або server-authoritative state. Garage завершено в U1 і повторно не перероблявся.

- [x] Auth отримав виразний split-layout із фактичними trust signals і збереженою семантикою форм.
- [x] Cart page/drawer отримали чітку hierarchy позицій, availability issues, sticky commercial summary та чесний media fallback.
- [x] Checkout success/cancel flow отримав progress context і status hierarchy без client-side підтвердження оплати.
- [x] Orders list став компактною responsive history surface, а detail — двоколонковим order/timeline layout.
- [x] Returns зберігають фактичну eligibility/status policy та вимагають явного підтвердження destructive cancellation.
- [x] Customer-facing copy очищено від transport/webhook/cache термінів без приховування важливих станів.
- [x] Виконано targeted F1/F4/F5 regression, typecheck, scoped lint і static responsive/accessibility review.

#### U2 implementation log

- Auth shell перебудовано в asymmetric storefront composition: форма залишається головною семантичною областю, а context panel пояснює vehicle/fitment/session value без вигаданих commercial claims.
- Cart items отримали технічний neutral placeholder, виразні quantity/remove states і summary panel; checkout як і раніше використовує фактичні backend totals, availability та Listing identifiers.
- Очищення кошика стало двоетапною дією. Початкова кнопка не видаляється з DOM, а confirmation region зв’язаний через `aria-expanded` і `aria-controls`, тому keyboard focus не губиться.
- Checkout return pages показують кроки Кошик → Stripe Checkout → Підтвердження та відображають лише фактичний Order status; redirect не встановлює `PAID`.
- Orders history адаптовано як щільну desktop table-like list із mobile card fallback; detail повторно використовує immutable OrderItem snapshots і наявну timeline.
- Return cancellation отримала inline confirmation зі збереженням focus target; create/cancel mutations, eligibility, ownership і cache invalidation не змінювалися.
- Референсні зображення використано лише як структурний орієнтир. Не додано product photos, delivery promises, wishlist, нові payment/order/return states або assets.

#### U2 validation results

- `pnpm --filter web test -- test/auth/auth-forms.spec.tsx` — passed, 1 file / 4 tests.
- `pnpm --filter web test -- test/commerce/cart-item.spec.tsx` — passed, 1 file / 1 test.
- `pnpm --filter web test -- test/commerce/checkout-button.spec.tsx` — passed, 1 file / 1 test.
- `pnpm --filter web test -- test/commerce/checkout-status.spec.ts` — passed, 1 file / 1 test.
- `pnpm --filter web test -- test/orders/order-presentation.spec.ts test/orders/return-presentation.spec.ts` — passed, 2 files / 5 tests.
- `pnpm --filter web test -- test/commerce/cart-boundary.spec.tsx test/orders/return-item-panel.spec.tsx` — passed, 2 files / 2 tests; підтверджено, що destructive mutation не відправляється до явного confirmation.
- Один початковий combined Vitest запуск не стартував через worker-response timeout; кожен affected test file було повторно запущено окремо та успішно пройдено.
- `pnpm --filter web check-types` — passed.
- Scoped ESLint для змінених U2 TS/TSX/test files — passed.
- `git diff --check` — passed; Windows LF → CRLF повідомлення є інформаційними.
- Static responsive/a11y review — passed: mobile stacking, desktop sticky summary/timeline, semantic headings/lists/status, visible focus, live mutation feedback і confirmation relationships збережено.
- Manual keyboard, screen-reader, 200% zoom, responsive device і Lighthouse validation для цілісного redesign залишається у U6.

### U3 — Supplier workspace

- Supplier sidebar/mobile Sheet, listings, forms, lifecycle, inventory conflict та OrderItems.
- Desktop table/mobile row compositions.
- F6 role/privacy/409 regression.

### U4 — Internal and Admin workspace

- Internal shell, OMS/Returns queues, detail/transitions, Notes, ActivityLog та moderation.
- High-density table system і explicit role/action hierarchy.
- F7 privacy/RBAC/moderation regression.

### U5 — Approved media/content integration

- Додати лише погоджені local assets або окремо approved media provider contract.
- Перевірити license manifest, aspect ratios, alt policy, `next/image`, CLS і fallbacks.
- Не входить у попередні slices, якщо approval/content відсутні.

### U6 — Redesign readiness gate

- Full frontend unit/component/E2E regression та selected backend contracts.
- Keyboard, screen-reader, zoom, contrast, responsive і reduced-motion review.
- Lighthouse на Home, Catalog, PDP і representative Supplier/Internal route.
- Повторити unresolved F8 external Google/Stripe manual checks.
- Оновити F8 із `Conditional` на `Ready` лише за фактичними результатами.

## Validation strategy per implementation slice

Мінімально:

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test -- <targeted-files>
git diff --check
```

Не запускати full Playwright/build після кожної CSS-зміни. Full regression, Lighthouse і manual screen-reader/responsive audit належать U6 або ризиковому route slice.

## Risks and mitigations

| Risk                                               | Mitigation                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| Масовий CSS rewrite ламає F0–F8 states             | Vertical slices, targeted tests і unchanged API/query layers              |
| Generic “all cards” redesign                       | Surface taxonomy: canvas, divider, inset, panel, featured only            |
| Automotive style стає декоративним/агресивним      | Один signal accent, typography/data hierarchy важливіші за effects        |
| Placeholder виглядає як product photo              | Explicit fallback label; category art не використовувати як product photo |
| Remote images створюють license/security risk      | Local-first; remotePatterns тільки після provider approval                |
| Mobile filter/sidebar приховує state               | Applied-filter summary, URL state, accessible Sheet title/focus           |
| Status color змінює meaning                        | Central semantic mapping + icon + text + backend status authority         |
| UI refactor розширює client bundle                 | Preserve RSC boundaries; interactive islands only                         |
| Accessibility перевіряється до завершення redesign | Targeted checks per slice, full manual gate після U4/U5                   |

## Recommended first implementation slice

Почати з **U0 — Design foundation and shell pilot**. Це найменший slice, який перевірить palette, typography, spacing, navigation, responsive behavior і automotive direction на реальному Home/Auth shell без ризику для Catalog, commerce або role workspaces.

До початку U0 потрібне погодження:

1. Direction “Precision Workshop”.
2. Signal-orange accent із graphite/cool-gray foundation.
3. Збереження local Geist Sans/Mono.
4. Generic local vehicle silhouette та honest product/category placeholders як окремий asset task.
5. Dark mode залишається deferred.
