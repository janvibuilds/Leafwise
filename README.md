# Plant Disease Classification

An AI-assisted plant disease classification system: a FastAPI backend that runs
an EfficientNetB3 classifier (38 Plant Village classes) over authenticated
uploads, stores predictions in private Supabase Storage, and a Next.js frontend
for marketing, auth, and prediction history.

## Status

| Area | Status |
| --- | --- |
| Model packaging & verification | ✅ done — original notebook model converted and weight-verified |
| FastAPI backend (inference + authenticated API) | ✅ done — 60 tests, ruff + mypy clean |
| Supabase schema, seed, and RLS policies | ✅ done — migrations + seed in `supabase/` |
| Next.js frontend (marketing, auth, prediction app) | ✅ done — route groups, subdomain routing, typed API client |
| CI (GitHub Actions) | ✅ done — lint, typecheck, tests, build on every PR |
| Integration, security pass, deployment | ⏳ pending (plan Task 8) |

Design and execution plan:

- `docs/superpowers/specs/2026-11-18-plant-disease-classification-design.md` — design spec
- `docs/superpowers/plans/2026-11-18-plant-disease-classification-implementation.md` — execution plan

## Repository layout

```text
├── backend/                     FastAPI service (app/, models/, tools/, tests/)
│   ├── app/                     API, services, ML inference, schemas
│   ├── models/                  labels.json, preprocessing.json, metrics.json, MODEL_CARD.md
│   ├── tools/convert_legacy_h5.py   reproducible .h5 → .keras conversion
│   └── README.md                API surface, error codes, commands
├── frontend/                    Next.js App Router scaffold
├── docs/superpowers/            spec + implementation plan
├── Plant_Village_Detection_Model.h5      original notebook artifact (git-ignored)
├── plant-village-detection-99-54-accuracy.ipynb   research/training reference
└── docker-compose.yml           (planned, Task 8)
```

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

The original `.h5` stays git-ignored (research reference, ~129 MB); the runtime SavedModel (~90 MB) is committed so fresh clones can run the API. Preprocessing replicates
training exactly — EXIF transpose → RGB → **NEAREST** 224×224 → ÷255 — see
`backend/models/preprocessing.json` and `backend/models/MODEL_CARD.md`.

## Backend quickstart

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install pytest httpx ruff mypy          # dev tools
cp .env.example .env                        # fill in Supabase values
uvicorn app.main:app --reload
```

Commands (from the repository root):

```bash
python -m pytest backend/tests -v    # 53 tests
python -m ruff check backend         # lint
cd backend && python -m mypy app     # type check
```

Health probes: `GET /health/live` (always 200) and `GET /health/ready`
(503 until model assets load). API surface, error codes, and auth details are
documented in `backend/README.md`.

## Frontend quickstart

```bash
cd frontend
npm install
npm run dev
```

Auth, typed API client, and all application pages are implemented — see
`frontend/README.md` for the local `lvh.me` setup. The frontend talks to
FastAPI with the Supabase access token as a Bearer header; the service-role
key never leaves the server.

## Environment variables

See `backend/.env.example` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWT_SECRET` are required; upload limits, bucket name, and CORS are
optional with defaults.

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
