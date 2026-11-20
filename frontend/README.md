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

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run typecheck   # TypeScript check
npm run lint        # ESLint
```
