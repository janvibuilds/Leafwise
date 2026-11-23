# Leafwise frontend

Next.js App Router frontend with three route groups:

```text
app/
├── (marketing)/       public landing page  → domain.com/
├── (auth)/            login, signup, reset → domain.com/login, /signup, …
│   └── auth/callback/ PKCE + OAuth callback route handler
└── (app)/             dashboard & workspace → app.domain.com/
proxy.ts               session refresh + subdomain routing
```

Route groups are organizational only — they do **not** appear in the URL.
`proxy.ts` (Next.js 16's rename of `middleware.ts`) maps `app.domain.com/` to
the internal `/dashboard` route and keeps protected pages on the app subdomain.

## Local setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local` with your Supabase **publishable** key (`sb_publishable_...`).
Never put a secret key in a `NEXT_PUBLIC_` variable.

Then visit:

- `http://lvh.me:3000` — marketing site
- `http://app.lvh.me:3000` — dashboard (redirects to login when signed out)

`lvh.me` resolves to `127.0.0.1` and supports real subdomain cookies. Next.js 16
dev normalizes `app.localhost` to `localhost`, which breaks cross-subdomain
redirects locally, so `lvh.me` is the recommended local host. In production use
your real Vercel domains.

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

## Vercel

Create two domains on the same Vercel project:

- `your-domain.com` → marketing + auth
- `app.your-domain.com` → workspace

Set the environment variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://app.your-domain.com
NEXT_PUBLIC_COOKIE_DOMAIN=your-domain.com
NEXT_PUBLIC_API_URL=https://your-fastapi-host
```

Also add `https://app.your-domain.com` and `https://your-domain.com` to the
FastAPI backend's `CORS_ORIGINS` before wiring the typed API client.

## Prediction flow and API client

The typed client lives in `lib/api-client.ts`:

- `lib/api-browser.ts` — used in client components, attaches the current
  Supabase access token from cookies.
- `lib/api-server.ts` — used in Server Components with the server session.

Set `NEXT_PUBLIC_API_URL` to the FastAPI base URL (default
`http://127.0.0.1:8000`). The backend must allow both frontend origins in
`CORS_ORIGINS`.

App routes now wired to the API:

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
npm run typecheck   # TypeScript check
npm run lint        # ESLint
```
