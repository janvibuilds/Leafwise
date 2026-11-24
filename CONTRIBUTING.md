# Contributing to Leafwise

Thanks for your interest in contributing! This document explains how the
project works, how to set up a development environment, and what we expect
from contributions.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Table of contents

- [How it works](#how-it-works)
- [Development setup](#development-setup)
- [Running the project locally](#running-the-project-locally)
- [Code style and quality gates](#code-style-and-quality-gates)
- [Git workflow](#git-workflow)
- [Submitting a pull request](#submitting-a-pull-request)
- [Reporting bugs and requesting features](#reporting-bugs-and-requesting-features)
- [Project layout](#project-layout)

## How it works

Leafwise is a three-part system: a **Next.js frontend**, a **FastAPI
backend** that runs the classifier, and **Supabase** for auth, data, and file
storage.

```text
Browser ──▶ Next.js (marketing site + app shell)
              │  server-side session cookies (Supabase SSR)
              │  typed API client with the user's access token
              ▼
           FastAPI (backend/)
              │  verifies Supabase JWTs (JWKS / shared secret)
              │  runs the EfficientNetB3 classifier (38 Plant Village classes)
              │  writes prediction rows + images
              ▼
           Supabase
              ├─ Auth        (email/password + Google OAuth, JWT sessions)
              ├─ Postgres    (predictions, feedback, model metadata — RLS protected)
              └─ Storage     (private `prediction-images` bucket, short-lived signed URLs)
```

### Frontend (`frontend/`)

- **Next.js 16 (App Router)** with route groups:
  - `app/(marketing)/` — public pages (home, how it works, supported plants…)
  - `app/(auth)/` — login, signup, password reset, OAuth callback
  - `app/(app)/` — authenticated workspace (dashboard, predict, history, profile)
- **`frontend/proxy.ts`** (Next's renamed middleware) routes by hostname:
  marketing lives on the main domain, the workspace on the `app.` subdomain,
  and auth pages are bounced back to the main domain. It also refreshes the
  Supabase session once per navigation.
- **Auth** uses `@supabase/ssr` cookie sessions plus server actions
  (`lib/auth/actions.ts`); `requireUser()` guards the app pages.
- **API access** goes through `lib/api-client.ts` (shared),
  `lib/api-browser.ts`, and `lib/api-server.ts`. The browser never sees
  service-role keys — the frontend only attaches the user's own access token
  (fetched from `GET /api/auth/token`).

### Backend (`backend/`)

- **FastAPI** app (`app/main.py`) with routers under `/api/v1`:
  `POST /predictions` (upload + classify), `GET /predictions` (history),
  `GET/PATCH /me`, public `GET /diseases`, plus `/health/live` and
  `/health/ready`.
- **Authentication** (`app/dependencies.py`): every protected route verifies
  the Supabase access token — ES256/RS256 via Supabase's JWKS (cached), with
  an HS256 shared-secret fallback.
- **Inference** (`app/ml/`): an adapter layer wraps the model so tests can
  substitute a fake predictor. Labels, preprocessing, and metrics contracts
  live in `backend/models/*.json`.
- **Storage** (`app/services/`): images go to a private Supabase Storage
  bucket; clients receive short-lived signed URLs, never permanent links.
- **Config** (`app/config.py`): settings come from environment variables (see
  `backend/.env.example`). Secret keys are validated at startup — publishable
  keys are rejected where a service-role key is required.

### Database (`supabase/`)

- `migrations/001_initial_schema.sql` — tables, RLS policies, storage bucket
- `seed.sql` — 38 disease rows + model version row
- `tests/schema-check.sql` — sanity queries you can run in the SQL Editor
- Apply order and instructions: `supabase/README.md`

### Data flow of a prediction

1. User signs in on the main domain → session cookie for the shared domain.
2. `app.` subdomain serves the workspace; the proxy refreshes the session.
3. Frontend uploads the image to `POST /api/v1/predictions` with the Bearer
   token.
4. Backend validates the token, checks the file (type, size), runs the
   classifier, stores the image privately, and inserts a prediction row.
5. History/detail pages read rows back and render images through expiring
   signed URLs.

## Development setup

### Prerequisites

| Tool | Version |
| --- | --- |
| Python | 3.12+ |
| Node.js | 20+ (24 LTS recommended) |
| npm | 10+ |
| Git | latest |

### Clone and configure

```bash
git clone https://github.com/janvibuilds/Leafwise.git
cd Leafwise
```

Secrets live in git-ignored `.env` files — never commit them:

- `backend/.env` — copy from `backend/.env.example` and fill in your Supabase
  project values (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_JWT_SECRET`).
- `frontend/.env.local` — Supabase publishable key and the site/app URLs.
  See `frontend/README.md` for the full list.

For local subdomain routing, add these to your hosts file
(`C:\Windows\System32\drivers\etc\hosts` on Windows, `/etc/hosts` on
macOS/Linux):

```text
127.0.0.1 lvh.me
127.0.0.1 app.lvh.me
```

`lvh.me` is used instead of `*.localhost` because the Next.js dev server
normalizes `app.localhost` to `localhost`, which breaks subdomain redirects.

### Install dependencies

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install pytest httpx ruff mypy # dev tools

# Frontend
cd ../frontend
npm install
```

## Running the project locally

Two terminals, from the repository root:

```bash
# Terminal 1 — API (port 8000)
cd backend
python -m uvicorn app.main:app --env-file .env --port 8000

# Terminal 2 — web app (port 3000)
cd frontend
npm run dev
```

Then open:

| URL | What |
| --- | --- |
| <http://lvh.me:3000> | Marketing site (sign up / sign in here) |
| <http://app.lvh.me:3000> | Workspace (redirects to login if signed out) |
| <http://127.0.0.1:8000/docs> | API Swagger UI |
| <http://127.0.0.1:8000/health/ready> | Readiness probe (model + config status) |

Tips:

- If port 8000 is already taken by an old process, find it with
  `netstat -ano | findstr :8000` and stop that PID before starting the API.
- In Supabase, disable **Confirm email** for development signups if you hit
  email rate limits (Authentication → Providers → Email). Documented in
  `frontend/README.md`.

## Code style and quality gates

Every PR must pass these checks locally first:

### Backend (Python)

```bash
python -m ruff check backend        # lint (E, F, I, UP, B; line length 100)
cd backend && python -m mypy app    # static typing
python -m pytest backend/tests -q   # test suite (60 tests)
```

- Follow existing patterns: routers → services → repositories, with
  dependencies injected through `app/dependencies.py`.
- New behavior needs tests; bug fixes need a regression test when practical.
- Type annotations are required (`mypy` runs with `check_untyped_defs`).

### Frontend (TypeScript / React)

```bash
cd frontend
npm run lint                        # ESLint
npm run typecheck                   # tsc --noEmit
npm run build                       # production build smoke test
```

- Use `react-icons` (Lucide set: `react-icons/lu`) for icons — no text/emoji
  glyphs in the UI.
- Server components by default; add `"use client"` only when the component
  needs state/effects.
- Pages that need a session must call `await connection()` and
  `await requireUser()` (Next.js 16 Cache Components).
- Keep the marketing / auth / app route-group separation intact.

> This project uses **Next.js 16**, which has breaking changes relative to
> older versions. Read the relevant guide in `node_modules/next/dist/docs/`
> before writing frontend code.

## Git workflow

1. **Create a branch** from the latest `main`:

   ```bash
   git switch main
   git pull
   git switch -c feat/short-description
   ```

2. **Branch naming:** `feat/…`, `fix/…`, `docs/…`, `test/…`, `refactor/…`,
   `chore/…`.

3. **Commit messages:** imperative mood, conventional prefix:

   ```text
   feat: add crop filter to history page
   fix: preserve next param when bouncing signed-in users
   docs: document local lvh.me setup
   ```

4. Keep commits focused — one logical change per commit.

## Submitting a pull request

1. Push your branch and open a PR against `main` on
   [janvibuilds/Leafwise](https://github.com/janvibuilds/Leafwise).
2. Fill in the PR template: what changed, why, and how you tested it.
3. Link related issues with `Closes #123`.
4. Ensure all [quality gates](#code-style-and-quality-gates) pass.
5. Respond to review feedback; maintainers may ask for changes before merging.

Reviewers look for:

- Correctness and test coverage for changed behavior
- Consistency with the existing architecture and naming
- No secrets, `.env` files, editor config, or build artifacts in the diff
- Clear, user-facing documentation when behavior changes

## Reporting bugs and requesting features

Use the issue templates:

- **Bug report** — steps to reproduce, expected vs. actual behavior, OS and
  browser/Python/Node versions, relevant logs or screenshots.
- **Feature request** — the problem you're solving, your proposed solution,
  and any alternatives.

For security issues, follow [SECURITY.md](SECURITY.md) instead — do not open
a public issue.

## Project layout

```text
.
├── backend/                 FastAPI service
│   ├── app/                 routers, services, ML inference, config, schemas
│   ├── models/              labels, preprocessing & metrics contracts, model card
│   ├── tests/               pytest suite (fakes — no TF/Supabase needed)
│   ├── tools/               maintenance scripts
│   └── README.md            API surface, error codes, auth details
├── frontend/                Next.js app (see frontend/README.md)
├── supabase/                migrations, seed data, schema checks
├── docs/                    design spec + implementation plan
├── .github/                 issue templates, PR template, CI workflow
├── CONTRIBUTING.md          this file
├── CODE_OF_CONDUCT.md       community standards
├── SECURITY.md              vulnerability reporting
└── LICENSE                  MIT
```

## Questions?

Open a discussion issue with the `question` label, or reach out to the
maintainers on [GitHub](https://github.com/janvibuilds/Leafwise). Welcome aboard!
