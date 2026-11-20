# Plant Disease Backend (FastAPI)

FastAPI service that authenticates users via Supabase Auth, runs the packaged
EfficientNetB3 classifier, and stores predictions in private Supabase Storage.

## Model assets (`backend/models/`)

| File | Purpose |
| --- | --- |
| `plant_disease_model.keras` | Runtime model (git-ignored, rebuilt with `tools/convert_legacy_h5.py`) |
| `labels.json` | Authoritative 38-class index → label order (never regenerated silently) |
| `preprocessing.json` | Exact runtime preprocessing contract (EXIF → RGB → NEAREST 224×224 → ÷255) |
| `metrics.json` | Notebook-reported metrics (not independently reproduced) + provisional thresholds |
| `MODEL_CARD.md` | Dataset, metrics, limitations, intended use |

The model applies `Rescaling(1/255) → Normalization → Rescaling` internally —
never use `keras.applications.efficientnet.preprocess_input` with it.

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
pip install pytest httpx ruff mypy                  # dev tools
cp .env.example .env                                # fill in Supabase values
```

If `backend/models/plant_disease_model.keras` is missing, rebuild it from the
original notebook artifact at the repository root:

```bash
python backend/tools/convert_legacy_h5.py
```

## Running

```bash
cd backend
python -m uvicorn app.main:app --env-file .env --reload   # dev
python -m uvicorn app.main:app --env-file .env --port 8000  # as verified below
```

`--env-file .env` is required: the app reads plain environment variables only
and does not parse `.env` itself (tests inject `Settings` directly). Startup
takes ~10–15 s while TensorFlow loads; `GET /health/live` returning
`{"status":"live"}` means it is ready. Interactive docs: `http://127.0.0.1:8000/docs`
(Swagger) and `/redoc`.

`app.main:app` is created lazily (PEP 562 module `__getattr__`), so importing
`create_app` in tests never loads TensorFlow.

### Manual smoke test (no real Supabase needed)

Health, auth, and inference work locally; persistence/storage endpoints
(`/diseases`, `GET/DELETE /predictions`) require a live Supabase (Task 2).

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
worked and only the storage upload failed.

## Commands (run from the repository root)

```bash
python -m pytest backend/tests -v     # tests (mypy/ruff config lives in backend/pyproject.toml)
python -m ruff check backend          # lint
cd backend && python -m mypy app      # type check (mypy resolves `app.*` from backend/)
```

The real-model contract test (`test_model_contract.py::test_runtime_model_loads_and_predicts`)
is skipped automatically when the `.keras` artifact has not been built.

## API surface

```text
GET    /health/live                                  liveness (no auth)
GET    /health/ready                                 readiness: 503 if model assets cannot load
GET    /api/v1/me                                    current user (Bearer token)
GET    /api/v1/diseases                              38 supported classes
GET    /api/v1/diseases/{disease_id}                 disease detail (id or model label)
POST   /api/v1/predictions                           multipart upload (field: `file`)
GET    /api/v1/predictions?limit=&offset=            history
GET    /api/v1/predictions/{id}?include_image=true   detail (+ short-lived signed URL)
DELETE /api/v1/predictions/{id}                      delete record + private image
POST   /api/v1/predictions/{id}/feedback             one row per user/prediction (409 on duplicate)
```

Responses use the camelCase contract from spec §10.3; errors use:

```json
{"error": {"code": "INVALID_IMAGE", "message": "safe, non-technical message"}}
```

Codes: `UNAUTHENTICATED`, `INVALID_IMAGE`, `IMAGE_TOO_LARGE`,
`PREDICTION_NOT_FOUND`, `DISEASE_NOT_FOUND`, `FEEDBACK_EXISTS`,
`MODEL_UNAVAILABLE`, `SERVICE_UNAVAILABLE`, `STORAGE_ERROR`,
`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`.

## Notes

- Auth: browser sends `Authorization: Bearer <Supabase access token>`; FastAPI
  verifies the HS256 token locally with `SUPABASE_JWT_SECRET` (no network call).
- The service-role key is server-only and never returned to the frontend.
- Upload limits: `MAX_UPLOAD_BYTES` (default 5 MB) and `MAX_IMAGE_PIXELS`
  (default 40 MP), enforced before TensorFlow sees the payload.
- Request-rate limits are infrastructure-level and configured in Task 8.
