# Render API Deployment Runbook

## Scope

Цей runbook описує перше розгортання NestJS API для public demo на Render
Free. Він не створює provider resources автоматично, не запускає migrations чи
seed і не перетворює demo на production для реальних користувачів.

Repository contract знаходиться в кореневому `render.yaml`. Render має читати
repository root, тому build бачить workspace lockfile та всі pnpm packages.

## Before creating the service

Потрібні такі передумови:

- PF2 migrations застосовані до окремої Neon public-demo database;
- `pnpm --filter api prisma:migrate:status` підтверджує, що schema up to date;
- створено Vercel project і зафіксовано його стабільний HTTPS origin;
- підготовлено окремі public-demo Google OAuth credentials;
- Stripe працює тільки в test mode;
- повна Git history перевірена перед будь-якою зміною repository visibility.

Не передавайте значення environment variables у Git, Markdown, screenshots,
issues або chat. У evidence записуйте тільки `configured` / `missing`.

## Blueprint contract

`render.yaml` фіксує:

- Node runtime, Free plan, `virginia` region і branch `main`;
- repository root як build context (поле `rootDir` навмисно відсутнє);
- pnpm `9.0.0` через root `packageManager` та Corepack;
- Node `>=22.12.0 <23` через root `engines`;
- frozen install із dev dependencies, потрібними для Nest build;
- Prisma Client generation, API build і `node dist/main` через
  `pnpm --filter api start:prod`;
- readiness health check `/api/v1/health/ready`;
- manual first deploy (`autoDeployTrigger: off`);
- API/workspace build filter, який не запускає API build для docs-only changes.

Blueprint не містить `preDeployCommand`, migration, seed, database resource,
persistent disk або secret values.

## Environment variables

Render самостійно надає `PORT`; не додавайте його вручну. Не додавайте
`TEST_DATABASE_URL`.

| Variable                      | Required value contract                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `NODE_ENV`                    | Committed value `production`                                |
| `DATABASE_URL`                | Neon pooled runtime URL with `sslmode=require`              |
| `BETTER_AUTH_SECRET`          | Public-demo-only secret, at least 32 characters             |
| `BETTER_AUTH_URL`             | Exact stable Vercel HTTPS origin                            |
| `GOOGLE_CLIENT_ID`            | Public-demo OAuth client identifier                         |
| `GOOGLE_CLIENT_SECRET`        | Public-demo OAuth client secret                             |
| `STRIPE_SECRET_KEY`           | Stripe test-mode key with `sk_test_` prefix                 |
| `STRIPE_WEBHOOK_SECRET`       | Secret for the hosted Render endpoint, with `whsec_` prefix |
| `STRIPE_CHECKOUT_SUCCESS_URL` | Vercel `/checkout/success` absolute HTTPS URL               |
| `STRIPE_CHECKOUT_CANCEL_URL`  | Vercel `/checkout/cancel` absolute HTTPS URL                |

Усі змінні з `sync: false` потрібно задати під час initial Blueprint creation.
Після створення service Render не оновлює такі значення з YAML — ротація або
додавання виконується вручну в Dashboard із наступним redeploy.

## First deployment order

1. Створіть Vercel project shell із branch `main`, отримайте стабільний
   `https://<web-project>.vercel.app` origin. Повний PF4 smoke поки не потрібен.
2. У Render виберіть **New → Blueprint**, підключіть repository і root
   `render.yaml`. Переконайтеся, що service має plan `Free`, region `Virginia`,
   branch `main` і auto-deploy disabled.
3. Заповніть усі `sync: false` variables у приватній provider form. Для
   `DATABASE_URL` використовуйте Neon pooled runtime connection, не operator
   direct migration URL.
4. Якщо Render URL ще не був відомий для Stripe registration, дозвольте першій
   спробі fail closed через відсутню конфігурацію. Після виділення стабільного
   `onrender.com` URL створіть Stripe test endpoint
   `https://<api-service>.onrender.com/api/v1/webhooks/stripe`, збережіть його
   signing secret у `STRIPE_WEBHOOK_SECRET` і запустіть manual deploy повторно.
   Не використовуйте local Stripe CLI signing secret.
5. Перевірте build log: frozen pnpm install, Prisma generation і Nest build
   мають завершитися без migration або seed output.
6. Перевірте startup log лише на відсутність configuration errors. Не копіюйте
   request headers, cookies, OAuth codes, database URLs або Stripe payloads.

## HTTPS smoke

Після успішного deploy виконайте з локального terminal:

```powershell
Invoke-RestMethod -Method Get -Uri "https://<api-service>.onrender.com/api/v1/health/live"
Invoke-RestMethod -Method Get -Uri "https://<api-service>.onrender.com/api/v1/health/ready"
```

Очікуваний body для обох endpoint — лише `status`. Не публікуйте повний Render
URL, якщо repository/demo policy вимагає приватності; достатньо recorded status
code, duration і timestamp.

У Dashboard також перевірте:

- HTTP health-check path дорівнює `/api/v1/health/ready`;
- active deploy відповідає очікуваному commit SHA;
- logs не містять secret values, cookies, authorization headers, OAuth codes,
  Stripe signatures/payloads або connection strings;
- service не використовує persistent disk чи local-file storage.

## Cold-start validation

Render Free може spin down після 15 хвилин без inbound traffic, а перше
пробудження може тривати приблизно хвилину. Keep-alive polling для обходу цього
обмеження не додається.

1. Не надсилайте traffic щонайменше 16 хвилин.
2. Викличте liveness і зафіксуйте duration/status без response headers.
3. Викличте readiness і зафіксуйте duration/status.
4. Повторіть readiness одразу: warm request має бути успішним.

Public-demo tolerance: cold request може бути повільним або вимагати один
повтор, але service повинен самостійно відновитися без manual restart. Persistent
failure, secret leakage або readiness `5xx` після warm retry блокує PF3.

## Stripe webhook recovery

- `PAID` встановлює тільки signature-verified webhook; browser return не є
  payment authority.
- Якщо Render спав або був недоступний, дочекайтеся automatic Stripe test-mode
  retry або виконайте resend із Stripe Dashboard/CLI після відновлення API.
- Duplicate delivery має залишатися idempotent.
- Не редагуйте payment/order status вручну в database і не повторюйте charge.
- Повний paid/duplicate/delayed/expired validation належить PF6.

## Rollback and recovery

1. Вимкніть mutations або приберіть public link, якщо порушено auth, ownership
   чи payment authority.
2. У Render Dashboard поверніть один із двох останніх known-good deploys.
3. Не запускайте `prisma migrate dev`, `db push`, reset або seed.
4. Після rollback повторіть liveness/readiness і перевірте deployed commit SHA.
5. Якщо schema несумісна, потрібна окрема forward corrective migration; code
   rollback не відкочує database schema.

## PF3 evidence template

| Check                       | Pass/Fail | Sanitized evidence |
| --------------------------- | --------- | ------------------ |
| Blueprint settings reviewed |           |                    |
| Required env names set      |           | configured/missing |
| First successful build      |           | commit + timestamp |
| No migration/seed in deploy |           | yes/no             |
| Liveness HTTPS              |           | status + duration  |
| Readiness HTTPS             |           | status + duration  |
| Warm retry                  |           | status + duration  |
| Cold-start recovery         |           | status + duration  |
| Provider log redaction      |           | pass/fail          |

PF3 hosted acceptance залишається незавершеним, доки ця таблиця не заповнена
без critical/high defect.
