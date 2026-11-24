# Codebase guide

A map of the repository: what each part does, and where to go when you want
to change something. Read [architecture.md](architecture.md) first if you
don't yet know how the pieces fit together.

**Legend:** 🟦 frontend · 🟨 backend · 🟩 database · 🟪 tooling/meta

---

## 1. "I want to change…" — quick index

| I want to… | Go to |
| --- | --- |
| Change a landing-page section (hero, how-it-works, use-cases…) | 🟦 `frontend/components/` (top-level sections: `Hero`, `Nav`, `SiteFooter`, `HowItWorksSection`, …) |
| Change the dashboard / workspace layout | 🟦 `frontend/app/(app)/layout.tsx` (sidebar shell) + `frontend/components/app/` (`AppShell`, `PageHeader`) |
| Change a prediction page (upload → result) | 🟦 `frontend/components/predictions/` (`ImageUpload`, `PredictionFlow`, `PredictionResult`, `ConfidenceBadge`) |
| Add or change an API endpoint | 🟨 `backend/app/api/` (router) → `backend/app/services/` (logic) → `backend/app/schemas/` (shapes) |
| Change how auth works / add a claim check | 🟨 `backend/app/dependencies.py` (verification) · 🟦 `frontend/lib/auth/actions.ts` (sign-in/up/out) · 🟦 `frontend/proxy.ts` (routing/guards) |
| Change prediction history / feedback / delete | 🟨 `backend/app/api/predictions.py`, `api/feedback.py`, `services/prediction_service.py` · 🟦 `frontend/components/history/HistoryView.tsx` |
| Change database tables, RLS, or the storage bucket | 🟩 `supabase/migrations/001_initial_schema.sql` (+ `seed.sql`, `tests/schema-check.sql`) |
| Change validation rules (file type, size, pixels) | 🟨 `backend/app/config.py` (limits) + `backend/app/services/prediction_service.py` (enforcement) |
| Change preprocessing (how images reach the model) | 🟨 `backend/app/ml/preprocessing.py` + `backend/models/preprocessing.json` (contract) |
| Add a new supported plant/disease class | 🟩 `supabase/seed.sql` + 🟨 `backend/models/labels.json` (they must stay in sync) |
| Change environment variables | 🟨 `backend/.env.example`, 🟦 `frontend/.env.example`, helpers in `frontend/lib/env.ts` |
| Change subdomain routing or redirects | 🟦 `frontend/proxy.ts` |
| Add an icon | 🟦 `react-icons` (Lucide: `react-icons/lu`); wordmark = `frontend/components/Brand.tsx` |
| Add a test | 🟨 `backend/tests/` (copy patterns from `test_predictions_api.py`) |
| Change CI / issue templates / PR template | 🟪 `.github/` |
| Change documentation | 🟪 `docs/` (see the [docs index](README.md) for where things go) |

---

## 2. 🟨 Backend (`backend/`)

### Entry and plumbing

| File | Role |
| --- | --- |
| `app/main.py` | App factory: CORS policy, router registration, startup model load. Exports `app` lazily (PEP 562) so importing the module in tests never loads TensorFlow |
| `app/config.py` | `Settings.from_env` — every env var, default, and validation rule (e.g. rejects a publishable key where the secret key belongs) |
| `app/dependencies.py` | **Auth core**: `decode_access_token` (JWKS ES256/RS256 + HS256 fallback), current-user resolver, service wiring |
| `app/errors.py` | Domain error types → the `{"error": {code, message}}` HTTP envelope |
| `app/schemas/` | Pydantic models: `prediction.py`, `disease.py`, `profile.py`. The camelCase fields here are mirrored by `frontend/lib/types.ts` |

### API layer (`app/api/`) — one router per resource

| File | Endpoints |
| --- | --- |
| `health.py` | `GET /health/live`, `GET /health/ready` (no auth) |
| `profiles.py` | `GET /api/v1/me` |
| `diseases.py` | `GET /api/v1/diseases`, `GET /api/v1/diseases/{id}` (public) |
| `predictions.py` | `POST/GET /api/v1/predictions`, `GET/DELETE …/{id}` |
| `feedback.py` | `POST /api/v1/predictions/{id}/feedback` |

Routers stay thin: parse → call a service → serialize. All external access
comes in through injected dependencies so tests can swap fakes.

### Service layer (`app/services/`)

| File | Responsibility |
| --- | --- |
| `prediction_service.py` | Orchestrates a scan: validate → preprocess → predict → store image → persist row; also list/detail/delete |
| `disease_service.py` | Catalog reads (id or label lookup) |
| `feedback_service.py` | One-feedback-per-prediction rule (409 on duplicates) |
| `storage_service.py` | Private-bucket upload and short-lived signed URLs |
| `supabase_repositories.py` | `SupabasePredictionRepository`, `SupabaseDiseaseRepository`, `SupabaseFeedbackRepository` — every query owner-filtered by `user_id` |

### ML layer (`app/ml/`)

| File | Responsibility |
| --- | --- |
| `predictor.py` | Predictor interface + real implementation (loads the packaged model once) and the test fake |
| `preprocessing.py` | The exact training-time preprocessing: EXIF transpose → RGB → NEAREST 224×224 → ÷255 |
| `model_metadata.py` | Loads `backend/models/*.json`: label order, thresholds, metrics |

> Note: the model applies its own rescaling internally — never use
> `keras.applications.efficientnet.preprocess_input` here.

### Tests (`backend/tests/`)

| File | Covers |
| --- | --- |
| `conftest.py` | Fixtures: fake env defaults, fake service bundle, `make_client()` |
| `fakes.py` | In-memory predictor/repositories/storage |
| `test_auth.py`, `test_auth_asymmetric.py` | HS256 and JWKS verification paths |
| `test_predictions_api.py` | Upload validation, happy path, error codes |
| `test_ownership.py` | Users can only read/delete their own rows |
| `test_diseases_api.py`, `test_feedback_api.py`, `test_health.py` | Resource endpoints |
| `test_predictor.py`, `test_preprocessing.py`, `test_model_contract.py` | ML behavior (contract test self-skips without model assets) |
| `test_config.py`, `test_storage_service.py` | Settings validation, storage behavior |

Run: `python -m pytest backend/tests -q` · `python -m ruff check backend` ·
`cd backend && python -m mypy app`

---

## 3. 🟦 Frontend (`frontend/`)

### Routing (`app/`) — read `proxy.ts` first

```text
app/
├── (marketing)/        public site        → lvh.me/
│   ├── page.tsx           landing page (sections composed from components/)
│   └── supported-plants/  all 38 classes from GET /api/v1/diseases
├── (auth)/             auth forms         → lvh.me/login …
│   ├── login/ signup/ forgot-password/ reset-password/
│   └── auth/callback/    OAuth + PKCE exchange
├── (app)/              workspace          → app.lvh.me/…
│   ├── layout.tsx         sidebar shell + requireUser guard
│   ├── dashboard/         greeting + quick cards
│   ├── predict/           upload → top-3 result
│   ├── history/           list + delete
│   ├── predictions/[id]/  detail + feedback + delete
│   ├── profile/           account info from GET /api/v1/me
│   ├── classes/ photo-guide/ settings/   workspace extras
├── api/auth/token/     same-origin token bridge for the browser
└── layout.tsx          root HTML shell, metadata, fonts
```

### Core files

| File | Role |
| --- | --- |
| `proxy.ts` | Session refresh + hostname routing + `next` preservation (see architecture §2.2) |
| `lib/env.ts` | Single source of truth for site/app/API/Supabase URLs and cookie options — read env vars here, nowhere else |
| `lib/api-client.ts` | Typed fetch logic shared by browser and server callers |
| `lib/api-browser.ts` | Client-side token via `GET /api/auth/token` |
| `lib/api-server.ts` | Server-side token from the server session |
| `lib/types.ts` | TS mirrors of the backend Pydantic contracts |
| `lib/auth/actions.ts` | Server actions: signIn, signUp, OAuth, reset, signOut |
| `lib/auth/session.ts` | `getCurrentUser()`, `requireUser(next)` guards |
| `lib/supabase/client.ts` / `server.ts` | Browser and server Supabase clients (SSR cookie adapters) |

### Components (`components/`)

| Area | Files | Notes |
| --- | --- | --- |
| Marketing sections | `Hero`, `Nav`, `SiteFooter`, `HowItWorksSection`, `ClassesSection`, `UseCasesSection`, `FieldSection`, `DiagnosticsSection`, `QuickScanSection`, `LivePreviewSection` | Figma-derived, mostly presentational |
| Shared | `Brand` (leaf wordmark), `UploadPill` (hero upload control) | Reused across layouts |
| Auth | `auth/AuthForm`, `auth/PasswordForm` | React `useActionState` around server actions |
| App shell | `components/app/` — `AppShell`, `PageHeader`, `Greeting`, `AppContext`, `icons` | Workspace chrome |
| Predictions | `predictions/ImageUpload`, `PredictionFlow`, `PredictionResult`, `PredictionHistory`, `ConfidenceBadge`, `PredictionDetailActions` | The scan UX end-to-end |
| Dashboard/history/classes/settings | `components/dashboard/Dashboard`, `history/HistoryView`, `classes/ClassesGallery`, `settings/SettingsForm` | Data-backed views |

Conventions: Server Components by default; `"use client"` only for
state/effects; icons from `react-icons/lu` (Lucide); data pages call
`await connection()` + `await requireUser()`.

Run: `npm run lint` · `npm run typecheck` · `npm run build`

---

## 4. 🟩 Database (`supabase/`)

| File | Role |
| --- | --- |
| `migrations/001_initial_schema.sql` | 5 tables, RLS policies, triggers, private `prediction-images` bucket. Safe to re-run |
| `seed.sql` | 38 `disease_information` rows + 1 `model_versions` row. Preserves expert-edited content; only refreshes the class mapping |
| `tests/schema-check.sql` | Verification query — must print `Supabase schema check passed \| 38 \| 1` |
| `README.md` | Apply order, backend key setup, security model |

Table relationship:

```text
auth.users ──1:1── profiles
     │
     ├──∞ predictions ──1:1── prediction_feedback
     │        │
     │        ├──?── disease_information   (linked by trigger; null when "uncertain")
     │        └──∞── model_versions
     └── (public read) disease_information, model_versions
```

---

## 5. 🟪 Tooling and meta

| Path | Role |
| --- | --- |
| `.github/workflows/ci.yml` | Backend lint/typecheck/tests + frontend lint/typecheck/build on every PR |
| `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md` | Contribution intake |
| `docs/` | Guides — see [docs/README.md](README.md) for the map and writing policy |
| `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE` | Community health files |
| `backend/tools/` | Maintenance scripts run by maintainers (e.g. rebuilding the model artifact) |
| `docs/superpowers/` | The original design spec and implementation plan |
| `plant-village-detection-99-54-accuracy.ipynb` | Research/training notebook — never executed by the app |

---

## 6. Suggested reading order for new contributors

1. [README.md](../README.md) — what the product is
2. [getting-started.md](getting-started.md) — get it running
3. [architecture.md](architecture.md) — how the tiers talk, auth and prediction lifecycles
4. `frontend/proxy.ts` and `backend/app/dependencies.py` — the two files that decide *who may do what*
5. One vertical slice end-to-end: `components/predictions/ImageUpload.tsx` → `lib/api-browser.ts` → `app/api/predictions.py` → `services/prediction_service.py`
6. This guide's [quick index](#1-i-want-to-change--quick-index) whenever you need to find a file
