# Architecture

This document explains how Leafwise is put together and *why*. If you're
looking for setup instructions, see [getting-started.md](getting-started.md);
if you're looking for a specific file, see
[codebase-guide.md](codebase-guide.md).

---

## 1. System overview

Leafwise is a three-tier web application with a deliberately thin middle
tier — the backend does exactly three jobs: **verify the caller**, **run the
classifier**, and **persist the result**.

```text
                    ┌──────────────────────────────────────────────┐
                    │                Browser                       │
                    │  lvh.me           → marketing + auth         │
                    │  app.lvh.me       → private workspace        │
                    └───────────────┬──────────────────────────────┘
                                    │  HTTPS (prod) / HTTP (local)
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  Next.js 16 — frontend/                                                   │
│                                                                           │
│  proxy.ts ──────────── refresh session once per navigation, route by host │
│  route groups ──────── (marketing) · (auth) · (app)                       │
│  server actions ────── sign-in, sign-up, OAuth, reset, sign-out           │
│  typed API client ──── attaches the user's access token to backend calls  │
└───────────────┬───────────────────────────────────────────────────────────┘
                │  Authorization: Bearer <Supabase access token>
                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  FastAPI — backend/                                                       │
│                                                                           │
│  api/ (routers) ── validate input, map errors                            │
│      │                                                                   │
│      ▼                                                                   │
│  services/ (business logic) ── ownership rules, confidence mapping       │
│      │              │                    │                                │
│      ▼              ▼                    ▼                                │
│  repositories   storage service      ml/predictor                        │
│  (Postgres via  (private bucket +    (classifier adapter,                │
│   Supabase)      signed URLs)         preprocessing)                     │
└───────────────┬───────────────────────────────────────────────────────────┘
                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  Supabase (managed cloud)                                                 │
│    Auth ──────── users, sessions, JWTs (ES256), email + Google OAuth     │
│    Postgres ──── 5 tables with Row Level Security                         │
│    Storage ───── private `prediction-images` bucket (≤ 5 MB, image types) │
└───────────────────────────────────────────────────────────────────────────┘
```

### Tech choices at a glance

| Concern | Choice | Reason |
| --- | --- | --- |
| Web framework | FastAPI | Pydantic validation, async, auto Swagger at `/docs` |
| Auth | Supabase Auth (JWT) | Managed users/OAuth; backend only verifies tokens, never stores passwords |
| Token verification | Supabase JWKS (ES256/RS256) | No shared secret needed for modern Supabase projects; HS256 fallback via `SUPABASE_JWT_SECRET` |
| Data access | Service-role key **on the server only** + owner filters in code | RLS is bypassed by design for the service role, so the backend re-applies `user_id` filters itself |
| Image delivery | Short-lived signed URLs | The bucket is private; permanent public URLs would leak user photos |
| Frontend routing | Hostname-based proxy | Marketing and workspace share one Next.js deployment but feel like two apps |
| UI icons | `react-icons` (Lucide) | One consistent, tree-shakeable set |

---

## 2. Frontend architecture

### 2.1 Route groups

Route groups are **organizational only** — the parentheses never appear in
the URL. They enforce the product's domain split:

| Group | URL prefix | Contents | Served to |
| --- | --- | --- | --- |
| `(marketing)` | `/` | landing page, `/supported-plants` | everyone |
| `(auth)` | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` | auth forms | signed-out users (bounced back to main domain) |
| `(app)` | on `app.` subdomain: `/dashboard`, `/predict`, `/history`, `/predictions/[id]`, `/profile`, `/classes`, `/photo-guide`, `/settings` | the workspace | signed-in users only |

### 2.2 The proxy (`frontend/proxy.ts`)

Next 16 renamed `middleware.ts` to `proxy.ts`. It runs before every matched
request and does three jobs:

1. **Refresh the session** — `supabase.auth.getUser()` validates the JWT with
   Supabase and rotates cookies when needed (once per navigation).
2. **Route by hostname**:

   | On | Requested path | Result |
   | --- | --- | --- |
   | `app.` subdomain | `/` | rewrite to `/dashboard` |
   | `app.` subdomain | `/login`, `/signup`, … | redirect to main domain (auth stays central) |
   | `app.` subdomain | app path, **signed out** | redirect to `main/login?next=…` |
   | main domain | `/dashboard`, `/predict`, … | redirect to `app.` subdomain |
   | main domain | auth page, **signed in** | redirect to workspace (preserving `next`) |

3. **Carry cookies across the jump** — pending Supabase cookies from the
   refresh are attached to the redirect response, and the `next` parameter
   preserves where the user was heading so a 401 bounce returns them to the
   page they wanted.

All redirects are emitted as **absolute** `Location` headers on purpose:
Next relativizes redirects it believes are same-origin, which breaks the
cross-subdomain bounce locally.

### 2.3 Session and auth UI

- **Cookie sessions** via `@supabase/ssr` — the domain is set to
  `NEXT_PUBLIC_COOKIE_DOMAIN` (e.g. `lvh.me`) so both hostnames share one
  session.
- **Server actions** (`lib/auth/actions.ts`) implement sign-up, sign-in,
  Google OAuth, password reset, and sign-out. They run on the server, so no
  secret ever reaches the browser.
- **Guards** — every `(app)` page calls `await connection()` (Next 16 Cache
  Components: mark the page request-time dynamic) and
  `await requireUser("/dashboard")`, which redirects signed-out visitors.
- **Auth pages bounce signed-in users** to the workspace instead of showing
  a login form to someone who's already logged in.

### 2.4 Talking to the backend

```text
component (client)  ──▶ lib/api-browser.ts ─┐
                                            ├──▶ lib/api-client.ts ──▶ FastAPI
component (server)  ──▶ lib/api-server.ts  ─┘
```

- `api-client.ts` owns the fetch logic: base URL, JSON/multipart handling,
  typed request/response shapes from `lib/types.ts`, error normalization.
- `api-browser.ts` gets the current access token from the server session via
  the same-origin route `GET /api/auth/token` (browser cookies for the app
  domain can't be read reliably across hosts, so the server hands the token
  over on demand).
- `api-server.ts` uses the server session directly in Server Components.
- The **service-role key never appears client-side** — the browser only ever
  holds the user's own access token.

### 2.5 Rendering model

Most pages are **Server Components** (no client JS shipped) with `"use client"`
only where state/effects are needed (upload widget, forms, history delete).
`export const instant = false` + `connection()` marks auth- and data-backed
pages as request-time rendered so a cached HTML page can never leak another
user's session.

---

## 3. Backend architecture

### 3.1 Layers

```text
HTTP request
   │
   ▼
app/main.py            app factory: CORS, router registration, lazy model load
   │
   ▼
app/api/*              routers: parse/validate input (Pydantic schemas),
   │                   map domain errors → HTTP + error code
   ▼
app/services/*         business logic: ownership checks, confidence states,
   │                   image validation, orchestration
   ├── supabase_repositories.py   Postgres reads/writes (owner-filtered)
   ├── storage_service.py         private-bucket upload + signed URLs
   └── prediction_service.py      ties predictor + repo + storage together
   ▼
app/ml/*               inference: predictor adapter, preprocessing contract,
                       model metadata (labels, thresholds)
   ▼
TensorFlow model       loaded once at startup from backend/models/
```

Key properties:

- **Routers are thin.** They don't touch Supabase or TensorFlow directly —
  everything is injected through `app/dependencies.py`, which is what lets
  tests substitute fakes for every external dependency.
- **Errors are typed.** `app/errors.py` defines the domain errors; the API
  layer converts them into the uniform envelope
  `{"error": {"code": "…", "message": "…"}}` with safe, non-technical
  messages.
- **Config is validated at startup** (`app/config.py`). A publishable key
  where a service-role key is required is rejected immediately instead of
  failing mysteriously on the first request.

### 3.2 Authentication (the important part)

Every protected endpoint resolves the caller like this:

```text
Authorization: Bearer <Supabase access token>
        │
        ▼
decode_access_token()                       (app/dependencies.py)
        │
        ├─ token header says ES256/RS256 ──▶ fetch Supabase JWKS (cached per URL)
        │                                    verify signature + exp + aud + sub
        │
        └─ token header says HS256 ────────▶ verify with SUPABASE_JWT_SECRET
                                             (legacy projects)
        │
        ▼
request.state.user = { id, email, … }       (401 UNAUTHENTICATED on failure)
```

- `aud`, `sub`, and `exp` are always checked; `iat` is deliberately **not**
  checked to tolerate clock skew between machines.
- The JWKS client caches keys per Supabase URL, so verification costs one
  network fetch at most, not one per request.

### 3.3 The prediction pipeline

See §4.2 for the full request lifecycle.

### 3.4 Interfaces (what each layer promises)

| Layer | Contract |
| --- | --- |
| `app/schemas/` | camelCase JSON shapes shared with the frontend (`lib/types.ts` mirrors them) |
| `app/ml/predictor.py` | `predict(image) → top-3 labels + confidences` — implemented by the real model and by test fakes |
| repositories | return plain dicts / `None`, never leak Postgres errors to routers |
| storage | `save(user_id, bytes)` → path; `signed_url(path)` → short-lived URL |

---

## 4. Request lifecycles

### 4.1 Signing in (and landing on the workspace)

```text
1. User visits lvh.me:3000/login
2. Server action calls Supabase Auth (password) or Google OAuth
3. Supabase returns a session → @supabase/ssr writes cookies with
   Domain=lvh.me, so both lvh.me and app.lvh.me receive them
4. Server action redirects to app.lvh.me:3000/dashboard
5. proxy.ts on app.lvh.me calls getUser() → session valid → page renders
6. requireUser() in the layout has a user → dashboard shows
```

Password reset follows the same shape: email link → `/reset-password` on the
main domain → new password → redirect into the workspace.

### 4.2 Uploading and classifying a leaf

```text
1.  User drops an image on /predict (client component)
2.  Frontend requests GET /api/auth/token → server returns the access token
3.  POST /api/v1/predictions  (multipart, field "file", Bearer token)
4.  Backend:
     a. verify token → request.state.user
     b. validate file: content type (JPEG/PNG/WEBP), size ≤ 5 MB,
        pixel count ≤ 40 MP — all before TensorFlow sees the bytes
     c. preprocess exactly as trained: EXIF transpose → RGB →
        NEAREST 224×224 → ÷255
     d. run the classifier → top-3 labels + confidences
     e. map confidence to a state (high / moderate / low / uncertain)
     f. upload the original image to the private bucket under
        <user-uuid>/<timestamp>-<name>
     g. INSERT the prediction row (Postgres trigger links the disease and
        model-version reference rows)
5.  Response: camelCase prediction object → frontend renders
     PredictionResult with ConfidenceBadge
6.  The row appears in /history; images render through short-lived signed
    URLs minted per request (GET /predictions/{id}?include_image=true)
```

Deleting a prediction removes **both** the row and the stored image.

### 4.3 Reading history

```text
GET /api/v1/predictions?limit=20&offset=0   (Bearer token)
  → repository query filtered by user_id = request.user.id
  → rows returned WITHOUT image URLs (they're short-lived)
GET /api/v1/predictions/{id}?include_image=true
  → row + signed URL valid for a few minutes
```

---

## 5. Data model

Five tables (see [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql)):

```text
profiles                 1:1 with auth.users — display info
model_versions           reference data: which model produced predictions
disease_information      reference data: 38 plant/disease rows + descriptions
predictions              the scans: user_id, image path, top result, state, …
prediction_feedback      1:1 per user+prediction — was the result helpful?
```

Reference data (`disease_information`, `model_versions`) is publicly readable;
everything user-owned is protected by **Row Level Security** and, because the
backend uses the service-role key (which bypasses RLS), **re-filtered by
`user_id` in application code** for every read, delete, and URL signing.

A database trigger links normal/high-confidence predictions to their disease
row and every prediction to the model-version row; deliberately `null` for
`uncertain` results (the system doesn't guess when it isn't sure).

---

## 6. Security model

Defense in depth — each layer assumes the others might fail:

| Layer | Mechanism |
| --- | --- |
| Transport | HTTPS in production (secure cookies enforced there) |
| Session | HttpOnly-ish Supabase SSR cookies scoped to the apex domain, SameSite=Lax, refreshed once per navigation |
| API auth | JWT signature verification via JWKS; `exp`/`aud`/`sub` validated |
| Secrets | Service-role key and JWT secret live only in server `.env` (git-ignored); config validation rejects publishable keys in secret positions |
| Input | Content-type allowlist, 5 MB size cap, 40 MP pixel cap enforced *before* inference (also mitigates decompression bombs) |
| Data | RLS on every table + owner filters in the backend for user-owned queries |
| Files | Private bucket, object paths prefixed with the owner's UUID, short-lived signed URLs only |
| Errors | Uniform envelope with safe messages; internals never leak to clients |
| Browser | The token bridge (`/api/auth/token`) is same-origin and session-guarded |

Out of scope by design (documented, not accidental): rate limiting (to be
configured at the infrastructure layer) and email ownership verification
(disable-able for development — see frontend README).

---

## 7. Key decisions (and the alternatives we rejected)

| Decision | Alternative rejected | Why |
| --- | --- | --- |
| `lvh.me` for local subdomains | `app.localhost` | Next 16 dev normalizes `app.localhost` → `localhost`, breaking cross-host redirects and cookies |
| Verify tokens via Supabase JWKS | Shared-secret only (HS256) | Modern Supabase issues ES256; JWKS removes secret-sharing between services, with HS256 kept as fallback |
| Token bridge route (`/api/auth/token`) | Parsing browser cookies in JS | Cookies for the shared domain aren't reliably readable from JS; the server session is the source of truth |
| Absolute `Location` headers in the proxy | `NextResponse.redirect()` | Next relativizes redirects it thinks are same-origin, which breaks subdomain jumps |
| Route groups + one deployment | Separate marketing/app apps | One codebase, one CI, one deploy — while URLs still express the split |
| Owner filters in app code despite RLS | RLS alone | The service-role key bypasses RLS by design; trusting RLS alone would be a bug |
| Fakes for tests (no TF, no Supabase) | Integration tests hitting real services | 60 tests run in ~20 s on every PR with zero network; the one real-model contract test self-skips when assets are absent |
| `connection()` + `instant = false` on data pages | Static prerendering | Cached HTML must never be able to show another user's session |

---

## 8. Quality architecture

- **Backend:** pytest with fixtures in `tests/conftest.py` that inject fake
  predictors, repositories, and storage — the app's dependency-injection
  style exists *for* this. ruff (E, F, I, UP, B; line 100) and mypy
  (`check_untyped_defs`) gate every change.
- **Frontend:** ESLint + `tsc --noEmit` + a production build on every PR.
- **CI:** `.github/workflows/ci.yml` runs both suites on each pull request
  against `main`.
- **Docs:** see [README](README.md) for the documentation map and the policy
  that keeps docs in sync with behavior.
