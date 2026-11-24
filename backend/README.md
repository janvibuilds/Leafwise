# Leafwise backend — FastAPI inference service

The backend is the middle tier of Leafwise: it **verifies who's calling**,
**classifies the uploaded leaf**, and **persists the result**. It holds all
secrets (Supabase secret key, JWT secret) — none of them ever reach the
browser.

```text
HTTP request → api/ (routers) → services/ (logic) → repositories · storage · ml/predictor
                     ↑                  ↑
              schemas/ (shapes)   dependencies.py (auth + wiring)
```

## Contents

- [Setup](#setup)
- [Running](#running)
- [Commands](#commands-run-from-the-repository-root)
- [Project structure](#project-structure)
- [Model assets (`backend/models/`)](#model-assets-backendmodels)
- [API surface](#api-surface)
- [Authentication](#authentication)
- [Errors](#errors)
- [Security notes](#security-notes)

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
pip install pytest httpx ruff mypy                  # dev tools
cp .env.example .env                                # fill in Supabase values
```

Required environment variables (see `supabase/README.md` for where to find
the values):

```env
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # SECRET key — publishable keys are rejected
SUPABASE_JWT_SECRET=<project JWT secret>
```

Optional: `MAX_UPLOAD_BYTES` (default 5 MB), `MAX_IMAGE_PIXELS` (default
40 MP), `STORAGE_BUCKET`, `CORS_ORIGINS`.

## Running

```bash
cd backend
python -m uvicorn app.main:app --env-file .env --reload   # dev
python -m uvicorn app.main:app --env-file .env --port 8000  # as used below
```

`--env-file .env` is required: the app reads plain environment variables only
and does not parse `.env` itself (tests inject `Settings` directly). Startup
takes ~10–15 s while TensorFlow loads; `GET /health/live` returning
`{"status":"live"}` means it is ready. Interactive docs:
`http://127.0.0.1:8000/docs` (Swagger) and `/redoc`.

`app.main:app` is created lazily (PEP 562 module `__getattr__`), so importing
`create_app` in tests never loads TensorFlow.

### Manual smoke test (no real Supabase needed)

```bash
curl http://127.0.0.1:8000/health/live
curl http://127.0.0.1:8000/health/ready
```

Generate a Bearer token your local server will accept (same secret as
`SUPABASE_JWT_SECRET` in `.env`):

```python
# python -  paste and run; prints a token for curl
import time, jwt
print(jwt.encode({"sub": "dev-user", "aud": "authenticated",
                  "role": "authenticated", "exp": int(time.time()) + 3600},
                 "your-jwt-secret", algorithm="HS256"))
```

```bash
TOKEN=<printed token>
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/v1/me
curl -H "Authorization: Bearer $TOKEN" -F "file=@path/to/leaf.jpg" \
     http://127.0.0.1:8000/api/v1/predictions
```

Without a live Supabase, a successful prediction run ends in
`502 STORAGE_ERROR` — that confirms auth + validation + model inference all
worked and only the storage upload failed. With Supabase configured, expect
`201` and a prediction object.

## Commands (run from the repository root)

```bash
python -m pytest backend/tests -q   # 60 tests (mypy/ruff config in backend/pyproject.toml)
python -m ruff check backend        # lint (E, F, I, UP, B; line length 100)
cd backend && python -m mypy app    # type check (mypy resolves `app.*` from backend/)
```

The real-model contract test (`test_model_contract.py::test_runtime_model_loads_and_predicts`)
is skipped automatically when the runtime model assets are absent.

## Project structure

```text
backend/
├── app/
│   ├── main.py              app factory: CORS, routers, startup model load
│   ├── config.py            Settings from env + validation (secret-key sanity checks)
│   ├── dependencies.py      JWT verification (JWKS/HS256) + dependency wiring
│   ├── errors.py            domain errors → {"error": {code, message}} envelope
│   ├── api/                 routers — one per resource, kept thin
│   │   ├── health.py        /health/live, /health/ready
│   │   ├── profiles.py      /api/v1/me
│   │   ├── diseases.py      /api/v1/diseases (public)
│   │   ├── predictions.py   /api/v1/predictions CRUD
│   │   └── feedback.py      /api/v1/predictions/{id}/feedback
│   ├── services/            business logic
│   │   ├── prediction_service.py       orchestration of a scan
│   │   ├── disease_service.py          catalog reads
│   │   ├── feedback_service.py         one-feedback rule
│   │   ├── storage_service.py          private upload + signed URLs
│   │   └── supabase_repositories.py    owner-filtered Postgres access
│   ├── ml/
│   │   ├── predictor.py     model adapter + test fake
│   │   ├── preprocessing.py EXIF → RGB → NEAREST 224×224 → ÷255
│   │   └── model_metadata.py labels/thresholds/metrics from *.json
│   └── schemas/             Pydantic request/response contracts (camelCase)
├── models/                  runtime assets + contracts (see below)
├── tests/                   60 tests using fakes — no TF, no network
├── tools/                   maintenance scripts (model rebuild)
├── pyproject.toml           deps + ruff/mypy/pytest config
├── requirements.txt         runtime dependencies
└── README.md                this file
```

**Layering rule:** routers never touch Supabase or TensorFlow directly —
they call services through injected dependencies. That's what lets the test
suite replace every external system with an in-memory fake.

## Model assets (`backend/models/`)

| File | Purpose |
| --- | --- |
| `plant_disease_model_tf/` | Runtime TensorFlow SavedModel (committed, ~90 MB; rebuilt with `tools/convert_legacy_h5.py`) |
| `labels.json` | Authoritative 38-class index → label order (never regenerated silently) |
| `preprocessing.json` | Exact runtime preprocessing contract (EXIF → RGB → NEAREST 224×224 → ÷255) |
| `metrics.json` | Notebook-reported metrics (not independently reproduced) + provisional thresholds |
| `MODEL_CARD.md` | Dataset, metrics, limitations, intended use |

The model applies `Rescaling(1/255) → Normalization → Rescaling` internally —
never use `keras.applications.efficientnet.preprocess_input` with it.

If the runtime directory is missing, rebuild it from the original notebook
artifact at the repository root:

```bash
python backend/tools/convert_legacy_h5.py
```

## API surface

```text
GET    /health/live                                  liveness (no auth)
GET    /health/ready                                 readiness: 503 if model assets cannot load
GET    /api/v1/me                                    current user (Bearer token)
GET    /api/v1/diseases                              38 supported classes (public)
GET    /api/v1/diseases/{disease_id}                 disease detail (id or model label)
POST   /api/v1/predictions                           multipart upload (field: `file`) → 201
GET    /api/v1/predictions?limit=&offset=            history (own rows only)
GET    /api/v1/predictions/{id}?include_image=true   detail (+ short-lived signed URL)
DELETE /api/v1/predictions/{id}                      delete record + private image
POST   /api/v1/predictions/{id}/feedback             one row per user/prediction (409 on duplicate)
```

| Endpoint group | Auth | Notes |
| --- | --- | --- |
| `/health/*` | none | used by uptime checks and to diagnose model-load failures |
| `/api/v1/diseases*` | none | read-only reference data |
| everything else | `Authorization: Bearer <access token>` | 401 `UNAUTHENTICATED` without a valid token |

Upload constraints (checked **before** inference): JPEG/PNG/WEBP only,
≤ `MAX_UPLOAD_BYTES` (5 MB), ≤ `MAX_IMAGE_PIXELS` (40 MP).

Try the live API at `http://127.0.0.1:8000/docs` while the server runs.

## Authentication

Protected endpoints resolve the caller in `app/dependencies.py`:

```text
Bearer token ──▶ header alg?
                  ├─ ES256/RS256 → Supabase JWKS (cached per project URL)
                  └─ HS256       → SUPABASE_JWT_SECRET (legacy projects)
                ──▶ verify signature, exp, aud, sub → request.state.user
```

- `iat` is intentionally not validated (clock-skew tolerance).
- The frontend sends the user's own Supabase access token; the service-role
  key is used only for server-side storage/database operations.
- More detail: [docs/architecture.md §3.2](../docs/architecture.md).

## Errors

Responses use the camelCase contract from the design spec; errors use:

```json
{"error": {"code": "INVALID_IMAGE", "message": "safe, non-technical message"}}
```

| Code | HTTP | Meaning |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | missing/invalid/expired token |
| `VALIDATION_ERROR` | 422 | malformed request fields |
| `INVALID_IMAGE` | 400 | not an allowed image type or unreadable image |
| `IMAGE_TOO_LARGE` | 413 | over the byte or pixel limit |
| `PREDICTION_NOT_FOUND` | 404 | no such prediction for this user |
| `DISEASE_NOT_FOUND` | 404 | unknown disease id/label |
| `FEEDBACK_EXISTS` | 409 | user already gave feedback on this prediction |
| `MODEL_UNAVAILABLE` | 503 | model failed to load (see `/health/ready`) |
| `SERVICE_UNAVAILABLE` | 503 | dependency unavailable |
| `STORAGE_ERROR` | 502 | Supabase Storage upload/sign failure |
| `NOT_FOUND` | 404 | route not found |
| `INTERNAL_ERROR` | 500 | unexpected failure (details logged, never returned) |

## Security notes

- Database schema, RLS policies, seed data, and the private storage bucket are
  defined in [`supabase/`](../supabase/README.md) at the repository root.
- The service-role key is server-only and never returned to the frontend.
- Even though that key bypasses RLS, every user-owned query is re-filtered by
  `user_id` in `services/` before data or image URLs leave the process.
- Upload limits are enforced before TensorFlow sees the payload (also guards
  against decompression bombs).
- Request-rate limits are infrastructure-level and configured in Task 8.
- See [docs/architecture.md §6](../docs/architecture.md) for the full
  security model.
