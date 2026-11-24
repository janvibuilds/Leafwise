# Leafwise frontend

The Next.js 16 web app: a public marketing site, auth pages, and the private
prediction workspace — one deployment, two hostnames.

```text
lvh.me        →  (marketing) + (auth)      the main site
app.lvh.me    →  (app)                     the workspace
```

## Contents

- [How routing works](#how-routing-works)
- [Project structure](#project-structure)
- [Local setup](#local-setup)
- [Supabase Auth setup](#supabase-auth-setup)
- [Prediction flow and API client](#prediction-flow-and-api-client)
- [Environment variables](#environment-variables)
- [Icons](#icons)
- [Vercel](#vercel)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)

## How routing works

```text
app/
├── (marketing)/       public landing page  → domain.com/
├── (auth)/            login, signup, reset → domain.com/login, /signup, …
│   └── auth/callback/ PKCE + OAuth callback route handler
├── (app)/             dashboard & workspace → app.domain.com/
└── api/auth/token/    same-origin token bridge for browser components
proxy.ts               session refresh + subdomain routing
```

Route groups are organizational only — they do **not** appear in the URL.
`proxy.ts` (Next.js 16's rename of `middleware.ts`) maps `app.domain.com/` to
the internal `/dashboard` route and keeps protected pages on the app
subdomain.

What the proxy does on every navigation:

| Host | Path | Behavior |
| --- | --- | --- |
| `app.` | `/` | rewrite to `/dashboard` |
| `app.` | `/login`, `/signup`, … | redirect to the main domain (auth stays central) |
| `app.` | app page, signed out | redirect to `main/login?next=…` |
| main | `/dashboard`, `/predict`, … | redirect to `app.` subdomain |
| main | auth page, signed in | redirect into the workspace (preserving `next`) |

It also refreshes the Supabase session once per navigation and re-attaches
any rotated cookies to the redirect response.

**Guards:** every `(app)` page calls `await connection()` (request-time
rendering — cached HTML must never carry a session) and
`await requireUser("/dashboard")` from `lib/auth/session.ts`.

## Project structure

```text
frontend/
├── proxy.ts                    session refresh + hostname routing
├── next.config.ts              Next.js configuration
├── app/
│   ├── layout.tsx              root HTML shell, metadata, fonts
│   ├── (marketing)/            public pages (home, /supported-plants)
│   ├── (auth)/                 login, signup, forgot/reset password, OAuth callback
│   ├── (app)/                  workspace pages behind requireUser():
│   │                           dashboard, predict, history, predictions/[id],
│   │                           profile, classes, photo-guide, settings
│   └── api/auth/token/         returns the server session token to browser code
├── lib/
│   ├── env.ts                  ★ all env vars read here (site/app/API/Supabase URLs)
│   ├── api-client.ts           shared typed fetch logic
│   ├── api-browser.ts          client-side calls (token via /api/auth/token)
│   ├── api-server.ts           server-component calls (token from session)
│   ├── types.ts                TS mirrors of backend Pydantic contracts
│   ├── auth/actions.ts         server actions: signIn, signUp, OAuth, reset, signOut
│   ├── auth/session.ts         getCurrentUser(), requireUser()
│   ├── auth/utils.ts           redirect helpers
│   ├── supabase/client.ts      browser Supabase client (SSR cookies)
│   ├── supabase/server.ts      server Supabase client
│   ├── assets.ts               image imports for marketing sections
│   └── plant-assets.ts         crop imagery used by the classes gallery
├── components/
│   ├── Brand.tsx               shared leaf wordmark
│   ├── Nav.tsx, SiteFooter.tsx, Hero.tsx, …   marketing sections
│   ├── UploadPill.tsx          hero upload control
│   ├── auth/                   AuthForm, PasswordForm
│   ├── app/                    AppShell, PageHeader, Greeting, AppContext, icons
│   ├── predictions/            ImageUpload, PredictionFlow, PredictionResult,
│   │                           PredictionHistory, ConfidenceBadge, PredictionDetailActions
│   ├── dashboard/ history/ classes/ settings/   data-backed views
│   └── …                       other marketing sections
└── README.md                   this file
```

**Conventions**

- Server Components by default; add `"use client"` only for state/effects.
- Icons come from `react-icons` (Lucide set, `react-icons/lu`).
- Data pages: `export const instant = false` + `await connection()` +
  `await requireUser()`.
- Never read `process.env` directly outside `lib/env.ts`.

## Local setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local` with your Supabase **publishable** key
(`sb_publishable_...`). Never put a secret key in a `NEXT_PUBLIC_` variable.

Then visit:

- `http://lvh.me:3000` — marketing site
- `http://app.lvh.me:3000` — dashboard (redirects to login when signed out)

`lvh.me` resolves to `127.0.0.1` and supports real subdomain cookies. Next.js 16
dev normalizes `app.localhost` to `localhost`, which breaks cross-subdomain
redirects locally, so `lvh.me` is the recommended local host. Add both hosts
entries as described in [docs/getting-started.md](../docs/getting-started.md).
In production use your real Vercel domains.

The FastAPI backend must be running on `NEXT_PUBLIC_API_URL` (default
`http://127.0.0.1:8000`) — see the repository
[README](../README.md#quickstart).

## Environment variables

All are read through `lib/env.ts`:

| Variable | Purpose | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe key (`sb_publishable_…`) | — |
| `NEXT_PUBLIC_SITE_URL` | Main-domain base URL | `http://lvh.me:3000` |
| `NEXT_PUBLIC_APP_URL` | Workspace base URL | `http://app.lvh.me:3000` |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Cookie domain shared by both hosts | `lvh.me` |
| `NEXT_PUBLIC_API_URL` | FastAPI base URL | `http://127.0.0.1:8000` |

Secrets (`sb_secret_…`, JWT secret) belong **only** in `backend/.env`.

## Supabase Auth setup

In **Authentication → URL Configuration**:

- Site URL: `http://lvh.me:3000`
- Redirect URLs:
  - `http://lvh.me:3000/auth/callback`
  - `http://app.lvh.me:3000/**`

For production add the equivalent HTTPS URLs for your domain and
`app.your-domain.com`.

To enable Google sign-in, turn on the Google provider in Supabase Auth and add
the same callback URL to the provider's allowed redirects. The button is
hidden from the user if the provider returns an error, with a safe message.

### Sign-up without confirmation email (avoids email rate limits)

By default Supabase sends a confirmation email on sign-up. On the free plan
this can hit `over_email_send_rate_limit`, which blocks new users.

To make sign-up log people in immediately with **no confirmation email**:

1. Supabase Dashboard → **Authentication → Providers → Email**
2. Turn **Confirm email** **OFF**
3. Save

The frontend already handles this: when Supabase returns an active session from
`signUp`, the user is redirected straight to `app.<domain>/dashboard`. Password
reset still uses email; that is the only remaining email-dependent flow.

> Trade-off: anyone can sign up with any email address without proving ownership.
> Fine for a demo/dev environment; re-enable confirmation before a real launch.

## Prediction flow and API client

The typed client lives in `lib/api-client.ts`:

- `lib/api-browser.ts` — used in client components, fetches the current
  access token from the same-origin `GET /api/auth/token` route.
- `lib/api-server.ts` — used in Server Components with the server session.

Set `NEXT_PUBLIC_API_URL` to the FastAPI base URL (default
`http://127.0.0.1:8000`). The backend must allow both frontend origins in
`CORS_ORIGINS`.

App routes wired to the API:

- `/predict` — upload one JPEG/PNG/WEBP image (≤5 MB), preview, analyze, show
  top-3 result with confidence state and responsible-use notice.
- `/history` — last 20 predictions with delete confirmation.
- `/predictions/[id]` — saved result, signed image link, one-per-prediction
  feedback, and delete.
- `/profile` — identity from `GET /api/v1/me`.

Public marketing route `/supported-plants` renders all 38 classes from
`GET /api/v1/diseases` (no auth required).

## Icons

Icons come from `react-icons`, using the Lucide set (`react-icons/lu`) for UI
icons and `FaGoogle` (`react-icons/fa`) for the Google brand mark. The shared
`Brand` component keeps the leaf wordmark consistent across all layouts.

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # TypeScript check (tsc --noEmit)
npm run lint        # ESLint
```

Run `npx next typegen` first if `typecheck` complains about missing route
types on a fresh clone.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ERR_NAME_NOT_RESOLVED` for `lvh.me` | Add the hosts entries (see Local setup), then `ipconfig /flushdns` |
| Redirect loop between the two hostnames | Clear cookies for `lvh.me` and sign in again |
| `503` in the browser | Dev server is compiling/restarting — watch the `npm run dev` terminal, hard-refresh (`Ctrl+Shift+R`) |
| Subdomain redirects go to `localhost` | You're using `app.localhost` — switch to `lvh.me` (Next dev normalizes `app.localhost`) |
| CORS errors against the API | Add `http://lvh.me:3000` and `http://app.lvh.me:3000` to backend `CORS_ORIGINS` |
| API calls return 401 | Backend `SUPABASE_JWT_SECRET` doesn't match the project, or the session expired — sign in again |
| Signup blocked by `over_email_send_rate_limit` | Turn **Confirm email** OFF (see above) |
| `tsc` complains about missing route types | `npx next typegen` |

More setup detail: [docs/getting-started.md](../docs/getting-started.md) ·
Architecture: [docs/architecture.md](../docs/architecture.md) ·
File map: [docs/codebase-guide.md](../docs/codebase-guide.md)
