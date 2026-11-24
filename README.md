# Leafwise — Plant Disease Classification

Upload a photo of a leaf, get the three most likely diseases with confidence
scores, and keep a private history of your scans. Leafwise is a full-stack
AI application: a **Next.js** web app, a **FastAPI** inference service running
an **EfficientNetB3** classifier over **38 Plant Village classes**, and
**Supabase** for authentication, data, and private image storage.

```text
  Leaf photo ──▶ Next.js ──▶ FastAPI ──▶ Supabase
               (web app)   (classify)   (auth + data + images)
```

## Features

- 🌿 **Leaf scanning** — upload a JPEG/PNG/WEBP (≤ 5 MB), get top-3
  predictions with a confidence state and a responsible-use notice
- 📊 **Personal history** — every scan is saved; revisit results, leave
  feedback, or delete records and their images
- 🔐 **Real auth** — email/password with reset flow **and** Google OAuth,
  powered by Supabase Auth with cross-subdomain cookie sessions
- 🗂 **Split domains** — marketing site on the main domain, private workspace
  on the `app.` subdomain, routed automatically by `frontend/proxy.ts`
- 🌍 **Public catalog** — browse all 38 supported plant/disease classes
  without an account (`/supported-plants`)
- ✅ **Quality gates** — 60 backend tests, ruff + mypy, ESLint + `tsc`, and a
  CI workflow that runs everything on each pull request

## How it works

```text
┌────────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│   ├─ lvh.me           → marketing + auth pages                    │
│   └─ app.lvh.me       → dashboard / predict / history / profile    │
└──────────────┬─────────────────────────────────────────────────────┘
               │  Next.js proxy: refresh session, route by hostname
               ▼
┌────────────────────────────────────────────────────────────────────┐
│  Next.js (frontend/)                                              │
│   route groups: (marketing) · (auth) · (app)                      │
│   typed API client attaches the user's Supabase access token       │
└──────────────┬─────────────────────────────────────────────────────┘
               │  Authorization: Bearer <access token>
               ▼
┌────────────────────────────────────────────────────────────────────┐
│  FastAPI (backend/)                                               │
│   verifies the token (Supabase JWKS) → validates the image        │
│   → runs the classifier → stores image + prediction row            │
└──────────────┬─────────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────────┐
│  Supabase                                                         │
│   Auth (users) · Postgres (predictions, RLS) · Storage (private)  │
└────────────────────────────────────────────────────────────────────┘
```

Deep dives: [docs/architecture.md](docs/architecture.md) ·
[docs/codebase-guide.md](docs/codebase-guide.md)

## Tech stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack) | Server components, route groups, `proxy.ts` subdomain routing |
| Styling | Tailwind CSS | Utility classes shared across marketing and app UIs |
| Icons | `react-icons` (Lucide set) | Consistent, tree-shakeable icon set |
| Backend | FastAPI + Pydantic | Typed request/response schemas, automatic Swagger docs |
| ML | TensorFlow 2.x / EfficientNetB3 | The notebook-trained classifier, served as a packaged artifact |
| Auth & data | Supabase (Auth, Postgres, Storage) | Managed JWT auth, RLS-protected tables, private buckets |
| Quality | pytest · ruff · mypy · ESLint · GitHub Actions | Automated checks on every PR |

## Quickstart

Full walkthrough (env files, hosts entries, first prediction):
**[docs/getting-started.md](docs/getting-started.md)**

```bash
# 1. Backend (terminal 1) — port 8000
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install pytest httpx ruff mypy
cp .env.example .env                                # fill in Supabase values
python -m uvicorn app.main:app --env-file .env --port 8000

# 2. Frontend (terminal 2) — port 3000
cd frontend
npm install
cp .env.example .env.local                          # fill in Supabase values
npm run dev
```

Then open <http://lvh.me:3000> (sign up) and <http://app.lvh.me:3000>
(workspace). Both require the `lvh.me` hosts entries described in
[docs/getting-started.md](docs/getting-started.md).

## Repository layout

```text
├── backend/                       FastAPI inference service
│   ├── app/
│   │   ├── api/                   route handlers (predictions, diseases, profile, health, feedback)
│   │   ├── services/              business logic + Supabase repositories/storage
│   │   ├── ml/                    predictor adapter, preprocessing, model metadata
│   │   ├── schemas/               Pydantic request/response contracts
│   │   ├── dependencies.py        JWT verification, service wiring
│   │   ├── config.py              env settings + secret validation
│   │   └── main.py                app factory, CORS, router registration
│   ├── models/                    labels, preprocessing & metrics contracts, model card
│   ├── tests/                     60 tests (fakes — no TensorFlow/Supabase needed)
│   ├── tools/                     maintenance scripts
│   └── README.md                  API surface, error codes, auth details
├── frontend/                      Next.js web app
│   ├── app/
│   │   ├── (marketing)/           public pages: home, supported plants
│   │   ├── (auth)/                login, signup, password reset, OAuth callback
│   │   ├── (app)/                 workspace: dashboard, predict, history, profile, …
│   │   └── api/auth/token/        server-side token bridge for the browser
│   ├── proxy.ts                   session refresh + subdomain routing
│   ├── lib/                       typed API client, auth helpers, Supabase clients, env
│   ├── components/                marketing sections, app shell, prediction UI
│   └── README.md                  frontend-specific setup (lvh.me, Vercel, Supabase URLs)
├── supabase/                      reproducible database package
│   ├── migrations/                schema + RLS policies + storage bucket
│   ├── seed.sql                   38 disease rows + model version
│   └── tests/schema-check.sql     verification query
├── docs/                          ★ start here — guides and architecture
│   ├── README.md                  documentation index + how we write docs
│   ├── getting-started.md         clone → configure → run → first prediction
│   ├── architecture.md            system design, request lifecycles, decisions
│   └── codebase-guide.md          "I want to change X → look here"
├── .github/                       issue templates, PR template, CI workflow
├── CONTRIBUTING.md                contribution workflow and quality gates
├── CODE_OF_CONDUCT.md             community standards
├── SECURITY.md                    private vulnerability reporting
└── LICENSE                        MIT
```

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/README.md](docs/README.md) | **Documentation index and policy** — what lives where and when to update it |
| [docs/getting-started.md](docs/getting-started.md) | Zero-to-first-prediction local setup, incl. troubleshooting |
| [docs/architecture.md](docs/architecture.md) | System design, auth & prediction lifecycles, security model, key decisions |
| [docs/codebase-guide.md](docs/codebase-guide.md) | File-by-file map: where to make each kind of change |
| [backend/README.md](backend/README.md) | API endpoints, error codes, auth verification, test commands |
| [frontend/README.md](frontend/README.md) | Route groups, proxy behavior, API client, Supabase/Vercel setup |
| [supabase/README.md](supabase/README.md) | Applying the schema, seed, and security model |
| [backend/models/MODEL_CARD.md](backend/models/MODEL_CARD.md) | Dataset, metrics, limitations, intended use |
| `docs/superpowers/` | Original design spec and implementation plan |

## Model artifact

The classifier was trained in the notebook
`plant-village-detection-99-54-accuracy.ipynb` (reported validation accuracy
99.53% — notebook-reported only, **not independently reproduced**). The
notebook stays a research artifact and is never executed in the request path.

The runtime uses `backend/models/plant_disease_model_tf/`, a TensorFlow
SavedModel rebuilt from the original `.h5` with exact weight verification:

```bash
python backend/tools/convert_legacy_h5.py
```

The original `.h5` stays git-ignored (research reference, ~129 MB); the
runtime SavedModel (~90 MB) is committed so fresh clones can run the API.
Preprocessing replicates training exactly — EXIF transpose → RGB → **NEAREST**
224×224 → ÷255 — see `backend/models/preprocessing.json` and
`backend/models/MODEL_CARD.md`.

## Testing and quality gates

```bash
# Backend (from the repository root)
python -m pytest backend/tests -q   # 60 tests — use fakes, no TF/Supabase needed
python -m ruff check backend        # lint (line length 100)
cd backend && python -m mypy app    # static typing

# Frontend
cd frontend
npm run lint                        # ESLint
npm run typecheck                   # tsc --noEmit
npm run build                       # production build smoke test
```

All of these run automatically on pull requests via
[.github/workflows/ci.yml](.github/workflows/ci.yml).

Health probes while the API runs: `GET /health/live` (always 200) and
`GET /health/ready` (503 until model assets load).

## Environment variables

| Where | File | Purpose |
| --- | --- | --- |
| Backend | `backend/.env` (from `.env.example`) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` required; upload limits, bucket name, CORS optional |
| Frontend | `frontend/.env.local` (from `.env.example`) | Supabase publishable key, site/app URLs, API base URL |

Secrets are git-ignored — never commit `.env` files. The service-role key is
server-only and must never appear in any `NEXT_PUBLIC_` variable.

## Status

| Area | Status |
| --- | --- |
| Model packaging & verification | ✅ done — original notebook model converted and weight-verified |
| FastAPI backend (inference + authenticated API) | ✅ done — 60 tests, ruff + mypy clean |
| Supabase schema, seed, and RLS policies | ✅ done — migrations + seed in `supabase/` |
| Next.js frontend (marketing, auth, prediction app) | ✅ done — route groups, subdomain routing, typed API client |
| Documentation | ✅ done — guides, architecture, codebase tour (see [docs/](docs/README.md)) |
| CI (GitHub Actions) | ✅ done — lint, typecheck, tests, build on every PR |
| Integration, security pass, deployment | ⏳ pending (plan Task 8) |

Design and execution plan:

- `docs/superpowers/specs/2026-11-18-plant-disease-classification-design.md` — design spec
- `docs/superpowers/plans/2026-11-18-plant-disease-classification-implementation.md` — execution plan

## Responsible use

This is an educational/demo classifier trained on controlled-background Plant
Village imagery. It is not a field diagnostic tool and must not be presented as
agricultural or treatment advice. Confidence thresholds are provisional pending
calibration — see `backend/models/MODEL_CARD.md`.

## Contributing

Contributions are welcome! Start with the
[Contributing Guide](CONTRIBUTING.md) — it covers the architecture, local
setup, quality gates, and PR workflow. All participants must follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

Found a security issue? Please report it privately via
[SECURITY.md](SECURITY.md) instead of a public issue.

## License

Released under the [MIT License](LICENSE).
