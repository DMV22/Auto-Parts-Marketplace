# Google OAuth Public-Demo Runbook

## Scope

This runbook covers Google OAuth for the public portfolio/demo environment. It
does not turn the platform into production for real customers, add account
recovery, or authorize storing real addresses or payment data.

The Google consent screen is `In production`, so any Google user may choose to
create an account. This creates a narrow exception to the original
synthetic-only data policy: Better Auth may persist the identity fields needed
for the account, including email, name and provider association. Stripe remains
test-only, and users must not enter real transactional data. Retention and
account-deletion ownership remain PF7/PF8 follow-ups.

## Canonical production boundary

- Browser-facing origin:
  `https://auto-parts-marketplace-web-bqbz.vercel.app`
- Authorized JavaScript origin:
  `https://auto-parts-marketplace-web-bqbz.vercel.app`
- Authorized redirect URI:
  `https://auto-parts-marketplace-web-bqbz.vercel.app/api/auth/callback/google`
- Better Auth and Checkout use the same canonical Vercel origin.
- Vercel forwards `/api/auth/*` to Render through server-only
  `API_INTERNAL_URL`.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` exist only in Render environment
  settings. Never copy them to Vercel, Git, screenshots, issues or reports.

The callback must not point directly to Render. The browser returns through
Vercel so the Better Auth session remains a first-party Secure HttpOnly cookie.

## Production-only policy

Google OAuth is supported only on the stable production Vercel domain. Dynamic
Preview deployment URLs are not added to Google Console. Preview deployments
may use the Render API for ordinary smoke checks, but they are not OAuth test
origins and must not be used to validate a real Google callback.

In practice:

1. A user starts Google sign-in on the stable Vercel site.
2. The relative `/api/auth/sign-in/social` request reaches Render through the
   Vercel rewrite.
3. Google redirects only to the allowlisted Vercel callback.
4. The callback is proxied to Better Auth on Render.
5. Better Auth establishes the first-party Vercel session and returns the user
   only to a validated local path.

For local development, the canonical callback is
`http://localhost:3000/api/auth/callback/google`. The direct API callback at
`http://localhost:3001/api/auth/callback/google` is not required by the current
same-origin browser workflow and should be removed from Google Console unless a
separately documented direct-API development flow still uses it.

## Redirect and account-linking policy

- `returnTo` accepts only a path on the current application origin.
- Absolute external URLs, protocol-relative URLs, malformed values and auth
  loops fall back to `/`.
- Google authorization responses must contain an HTTPS URL before the browser
  navigates away.
- Implicit email linking is disabled.
- Explicit linking requires an authenticated session and the same provider
  email; provider profile data does not overwrite the local user.
- A Google-only account may create a credential password through the
  authenticated `/api/v1/me/password` boundary.
- Password creation delegates to Better Auth's server-side API and requires a
  fresh valid session. Existing credentials produce a conflict instead of
  silently replacing a password.

## Manual validation

Perform these checks only on the canonical production Vercel origin. Record
pass/fail and nonsensitive timestamps; do not record OAuth codes, state values,
tokens, cookies, client secrets or personal profile data.

1. Sign in with a new Google-only account and confirm callback completion.
2. Refresh an authenticated page and confirm the session remains valid.
3. Sign out, confirm protected UI becomes anonymous, then sign in again.
4. Sign in to an email/password account and explicitly link the matching Google
   account from Account Security.
5. Confirm linking a Google account with a different email is rejected.
6. For a Google-only account, create a password and confirm both Google and
   email/password sign-in work afterward.
7. Inspect cookie attributes without recording its value: `HttpOnly`, `Secure`,
   `SameSite=Lax`, first-party Vercel domain.
8. Confirm localStorage and sessionStorage contain no session, OAuth or owner
   credentials.

## Evidence

| Check                               | Result | Evidence policy              |
| ----------------------------------- | ------ | ---------------------------- |
| Production origin allowlisted       | Pass   | Public origin only           |
| Exact production callback           | Pass   | Public callback only         |
| Credentials stored only on Render   | Pass   | Variable names, never values |
| New Google-only sign-in             | Pass   | Result and timestamp only    |
| Refresh and sign-out                | Pass   | Result only                  |
| Explicit same-email linking         | Pass   | Result only                  |
| Different-email linking rejected    | Pass   | Result only                  |
| Google-only password creation       | Pass   | Result only                  |
| Both sign-in methods after password | Pass   | Result only                  |
| Secure HttpOnly session             | Pass   | Attributes only, never value |
| Unsafe external `returnTo` rejected | Pass   | Automated regression test    |

## Failure and rollback

If callback, linking or cookie behavior regresses:

1. Stop advertising Google sign-in and retain email/password access.
2. Verify the exact production origin and callback in Google Console.
3. Verify only the required variable names are configured on Render without
   revealing their values.
4. Roll back Vercel and Render to their last known-good revisions if the
   regression came from code.
5. Do not enable implicit linking or broaden redirect origins as a workaround.
6. Re-run the manual checklist and targeted auth tests before restoring access.
