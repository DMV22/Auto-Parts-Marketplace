# Backend Roadmap: Milestones 6–10

## Призначення

Цей документ містить high-level roadmap backend-розробки Auto Parts Marketplace.

Його потрібно використовувати як джерело бізнес-цілей, scope, ключових задач і Definition of Done для Milestones 6–10. Детальні execution plans для кожного milestone мають створюватися окремо в `docs/` і не повинні суперечити цьому roadmap.

## Загальні правила

- Кожен наступний milestone спирається на завершений попередній.
- Не додавати функціональність наступних milestones достроково.
- Для schema changes використовувати лише нові forward migrations.
- Не редагувати historical Prisma migrations.
- Всі critical flows покривати integration або E2E тестами.
- Ownership, RBAC, payment state і server-side validation не можна перекладати на frontend.
- `Guest` є станом неавтентифікованого запиту, а не persisted DB role.

---

# Milestone 6 — Domain Foundation, Full Schema та Auth/RBAC

## Goal

Зафіксувати цільову доменну модель backend і реалізувати session-based authentication та role-aware доступ. Це є фундаментом для всіх наступних API.

## Key Tasks

- Узгодити перехід від `Part` / `Vehicle` / `Fitment` до:
  - `Product`;
  - `ProductVariant`;
  - `FitmentRule`;
  - `VehicleMake`;
  - `VehicleModel`;
  - `VehicleGeneration`;
  - `EngineType`.
- Розширити Prisma schema групами:
  - Auth/RBAC;
  - Customer;
  - Vehicle taxonomy;
  - Catalog;
  - Commerce;
  - Support;
  - Supplier.
- Зафіксувати статуси й допустимі transitions для:
  - `Listing`;
  - `Order`;
  - payment;
  - `ReturnRequest`.
- Реалізувати:
  - `User`;
  - Role;
  - Session;
  - `CustomerProfile`;
  - `Supplier`;
  - зв’язок користувача з постачальником.
- Додати:
  - sign-up;
  - sign-in;
  - sign-out;
  - session validation;
  - Nest guards;
  - permission helpers для `Customer`, `SupplierUser`, `SupportManager`, `Admin`.
- Додати seed-набір:
  - ролей;
  - тестових користувачів;
  - vehicle taxonomy;
  - мінімального каталогу.

## Definition of Done

- Чиста база відтворюється з committed migrations і seed.
- У schema немає дублювання між старою та цільовою моделями.
- Authentication lifecycle покритий integration tests.
- RBAC matrix перевірена для всіх persisted ролей.
- `SupplierUser` не може отримати доступ до іншого `Supplier`.
- `Guest` залишається неавтентифікованим станом, а не DB-роллю.

---

# Milestone 7 — Fitment-aware Catalog API

## Goal

Створити стабільний read-oriented API для vehicle selection, каталогу та PDP без frontend-реалізації.

## Key Tasks

- Реалізувати API vehicle taxonomy для flow:

  ```text
  Year → Make → Model → Generation → Engine
  ```

- Додати customer garage API:
  - створення `SavedVehicle`;
  - видалення `SavedVehicle`;
  - вибір active `SavedVehicle`.
- Реалізувати catalog search:
  - keyword;
  - SKU;
  - category;
  - brand;
  - price;
  - stock;
  - condition;
  - vehicle compatibility.
- Додати:
  - pagination;
  - deterministic sorting;
  - validation query parameters.
- Реалізувати PDP API з:
  - Product;
  - variants;
  - OEM/SKU;
  - supplier;
  - stock/availability;
  - compatibility details.
- Визначити fitment responses:
  - `compatible`;
  - `incompatible`;
  - `unknown`;
  - `caution`.
- Товар не може вважатися `compatible` без явного `FitmentRule`.

## Definition of Done

- Catalog повертає передбачуваний paginated результат.
- Active `SavedVehicle` коректно фільтрує compatible variants/listings.
- PDP показує fitment details і не подає неповне покриття як гарантовану сумісність.
- Garage endpoints доступні лише власнику профілю.
- Search, filters, PDP і fitment rules покриті integration tests.

---

# Milestone 8 — Cart, Checkout та Orders

## Goal

Реалізувати backend commerce lifecycle від кошика до webhook-confirmed замовлення.

## Key Tasks

- Реалізувати `Cart` і `CartItem` для guest/customer flow із server-side validation:
  - Listing;
  - stock;
  - актуальна ціна;
  - currency;
  - quantity.
- Створювати `Order` зі статусом pending до переходу в Stripe Checkout.
- Формувати Stripe Checkout Session лише на сервері.
- Додати webhook endpoint із перевіркою Stripe signature.
- Зберігати `PaymentEvent.externalEventId` для idempotency.
- Змінювати payment/order status лише після валідного webhook.
- Реалізувати:
  - customer order history;
  - order detail;
  - status timeline API.

## Definition of Done

- Pending `Order` створюється до redirect у Stripe.
- Client success redirect не може самостійно позначити `Order` як `paid`.
- Валідний webhook атомарно оновлює payment/order state.
- Повторний webhook не створює дублікати та безпечно ігнорується.
- Customer бачить лише власні `Cart` і `Order`.
- Ключовий commerce lifecycle покритий integration tests.

---

# Milestone 9 — Supplier Cabinet API

## Goal

Надати постачальнику ізольований backend API для listings, inventory та пов’язаних order items.

## Key Tasks

- Реалізувати створення й редагування власних `Listing` із прив’язкою до `ProductVariant`.
- Додати stock update:
  - валідація невід’ємної кількості;
  - захист від некоректних конкурентних змін.
- Реалізувати approval lifecycle:

  ```text
  draft/pending → approved/published | rejected
  ```

- Додати supplier order-items API лише для товарів конкретного `Supplier`.
- Додати filters/pagination для:
  - listings;
  - inventory;
  - supplier orders.
- Централізовано застосувати supplier ownership policy у guards/services.

## Definition of Done

- Supplier керує лише власними `Listing` і stock records.
- Неопублікований або відхилений `Listing` не потрапляє в публічний catalog.
- Supplier бачить лише власні частини замовлень, без чужих supplier data.
- Ownership і approval rules покриті негативними integration tests.
- Не додавати:
  - payouts;
  - multi-warehouse routing;
  - shipping integrations.

---

# Milestone 10 — Internal CRM/OMS, Returns та Moderation

## Goal

Завершити operational backend для support/admin ролей: черги замовлень, повернення, internal notes, moderation та audit trail.

## Key Tasks

- Реалізувати global orders queue з filters за:
  - order status;
  - payment status;
  - detail timeline.
- Додати `ReturnRequest` для конкретного `OrderItem`.
- Дозволити створення return лише для delivered item.
- Реалізувати контрольовані return transitions:

  ```text
  requested → under_review → approved | rejected → terminal state
  ```

- Додати internal-only `Note`, недоступний `Customer` і `SupplierUser`.
- Реалізувати listing moderation для `Admin`:
  - review;
  - publish;
  - reject.
- Записувати ключові зміни статусів у `ActivityLog`.

## Definition of Done

- `SupportManager` може опрацьовувати orders і returns у межах RBAC.
- Return для недоставленого або чужого `OrderItem` відхиляється.
- Internal Notes ніколи не потрапляють у customer/supplier responses.
- `Admin` може модерувати Listings, а результат відображається в Supplier API.
- Status transitions, permissions і `ActivityLog` покриті integration tests.

---

# Рекомендована послідовність

```text
Milestone 6: Domain + Auth/RBAC
  ↓
Milestone 7: Vehicle + Catalog + Fitment API
  ↓
Milestone 8: Cart + Checkout + Orders
  ↓
Milestone 9: Supplier Cabinet API
  ↓
Milestone 10: CRM/OMS + Returns + Moderation
```

## Залежності між milestones

- Supplier Cabinet потрібно реалізовувати після Orders, тому що supplier order-items API залежить від стабільної commerce-моделі.
- CRM/OMS і Returns мають іти останніми, оскільки вони одночасно залежать від:
  - users;
  - listings;
  - orders;
  - delivery states;
  - supplier ownership;
  - RBAC;
  - audit trail.