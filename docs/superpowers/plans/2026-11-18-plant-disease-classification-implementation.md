# AI-Assisted Plant Disease Classification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete web application that uses the original notebook-trained 38-class EfficientNetB3 model (packaged and verified from `Plant_Village_Detection_Model.h5`) to classify plant-disease images through a FastAPI backend, with a Next.js frontend and Supabase Auth, PostgreSQL, and Storage.

**Architecture:** Next.js is the only browser-facing application. It authenticates users with Supabase Auth and sends the Supabase access token as a Bearer token to one FastAPI service. FastAPI verifies the user, validates and stores the image, runs the in-process TensorFlow/Keras model, persists the prediction, and returns a structured result. Supabase is used for Auth, PostgreSQL, and private image storage; the model is packaged and verified before backend integration.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, FastAPI, Pydantic, Python 3.11+, TensorFlow/Keras, EfficientNetB3, Pillow, pytest, Supabase Auth, Supabase PostgreSQL, Supabase Storage, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-11-18-plant-disease-classification-design.md`

## Global Constraints

- Support all 38 classes represented in `plant-village-detection-99-54-accuracy.ipynb`, including healthy classes.
- Use the original notebook-trained model (`Plant_Village_Detection_Model.h5`) — packaged, weight-verified and converted to `.keras` — rather than a retrained replacement. Retrain only if the evaluation gate fails.
- Do not execute the notebook in the production request path.
- Use the exact documented preprocessing for both training and inference; the model contains an internal `Rescaling(1/255)`, so the runtime divides by 255 exactly once more (replicating training) and must never apply `preprocess_input`.
- Resize with NEAREST to match the training generator; do not silently substitute bicubic.
- The notebook's reported `99.53%` is not production accuracy until independently reproduced and documented.
- The browser calls FastAPI for protected application operations; it does not receive the Supabase service-role key.
- Use a private Supabase Storage bucket and enforce user ownership for prediction records and images.
- Return top-three predictions and an explicit uncertain state below the configured threshold.
- Do not provide automatic pesticide prescriptions or claim guaranteed diagnosis.
- Keep model assets, labels, preprocessing, metrics, and model-card metadata versioned and reproducible; do not commit a large model binary unless its size and license permit it.
- Use internal API versioning under `/api/v1`.

## Review Focus

- **Model artifact integrity:** packaging must produce a loadable `.keras` model whose weights match the original `.h5` exactly, plus labels, preprocessing metadata, and metrics, before any inference endpoint is integrated; test this in Task 1.
- **Label/preprocessing mismatch:** a 38-output model with a different label order, resize filter, or scaling must fail startup or a model contract test; test this in Task 1 and Task 3.
- **Untrusted uploads:** corrupt, oversized, non-image, and unsupported images must produce safe validation errors without invoking the model; test this in Task 3 and Task 4.
- **Cross-user access:** a valid user must not read, delete, or obtain image URLs for another user's prediction; test this in Task 2 and Task 4.
- **Low-confidence output:** a low top score must produce `uncertain` rather than a falsely definitive diagnosis; test this in Task 3 and Task 6.

---

## File Map

### Model packaging and artifacts

- Create: `backend/tools/convert_legacy_h5.py` — reproducible `Plant_Village_Detection_Model.h5` → `.keras` conversion with by-name weight verification.
- Create: `backend/models/labels.json` — canonical output-index-to-label mapping recovered from the notebook's `class_indices` output.
- Create: `backend/models/preprocessing.json` — image size, color mode, resize filter, scaling, and model version contract.
- Create: `backend/models/metrics.json` — notebook-reported metrics (marked as not independently reproduced) and provisional threshold-selection results.
- Create: `backend/models/MODEL_CARD.md` — dataset, training method, metrics, limitations, and intended use.
- Generated/external: `backend/models/plant_disease_model.keras` — verified runtime artifact; keep outside Git (46 MB).
- Reference/original: `Plant_Village_Detection_Model.h5` — original notebook artifact; keep outside Git (129 MB).

### Training (deferred fallback)

Only activated if the packaged model fails the evaluation gate:

- Create: `training/config.yaml` — dataset paths, image size, batch size, seed, epochs, learning rates, and threshold-selection settings.
- Create: `training/train.py` — reproducible two-stage EfficientNetB3 training and checkpoint export.
- Create: `training/evaluate.py` — deterministic evaluation, per-class metrics, confusion matrix data, and model-card inputs.
- Create: `training/requirements.txt` — training-only dependencies.
- Create: `training/README.md` — dataset acquisition, commands, expected outputs, and licensing notes.

### Supabase schema

- Create: `supabase/migrations/001_initial_schema.sql` — tables, indexes, constraints, and RLS policies.
- Create: `supabase/seed.sql` — 38-class disease-information seed records and initial model-version metadata.
- Create: `supabase/README.md` — project setup, migration, seed, Auth, and private Storage configuration.

### FastAPI backend

- Create: `backend/pyproject.toml` — runtime and test dependencies plus tool configuration.
- Create: `backend/app/main.py` — FastAPI application and router registration.
- Create: `backend/app/config.py` — validated environment settings.
- Create: `backend/app/dependencies.py` — Bearer-token extraction, Supabase user verification, and request dependencies.
- Create: `backend/app/api/health.py` — liveness and readiness endpoints.
- Create: `backend/app/api/predictions.py` — create, list, detail, and delete prediction routes.
- Create: `backend/app/api/diseases.py` — supported-class and disease-information routes.
- Create: `backend/app/api/feedback.py` — prediction feedback route.
- Create: `backend/app/api/profiles.py` — current-user profile route.
- Create: `backend/app/schemas/prediction.py` — request/response models and confidence states.
- Create: `backend/app/schemas/disease.py` — disease and supported-class models.
- Create: `backend/app/schemas/profile.py` — profile models.
- Create: `backend/app/services/prediction_service.py` — prediction workflow orchestration.
- Create: `backend/app/services/storage_service.py` — private image upload, signed URL, and deletion operations.
- Create: `backend/app/services/disease_service.py` — disease-information reads.
- Create: `backend/app/services/feedback_service.py` — feedback persistence.
- Create: `backend/app/ml/predictor.py` — model loading, contract validation, and inference.
- Create: `backend/app/ml/preprocessing.py` — image decoding and exact runtime preprocessing.
- Create: `backend/app/ml/model_metadata.py` — model assets and version loading.
- Create: `backend/tests/` — unit, API, and integration tests.
- Create: `backend/Dockerfile` — production FastAPI image.
- Create: `backend/.env.example` — non-secret environment variable names.

### Next.js frontend

- Create: `frontend/` — Next.js App Router application.
- Create: `frontend/app/(marketing)/...` — public marketing pages.
- Create: `frontend/app/(auth)/...` — sign-in, sign-up, verification, and password-reset pages.
- Create: `frontend/app/(app)/dashboard/...` — authenticated dashboard, upload, result, history, and profile pages.
- Create: `frontend/lib/supabase/browser.ts` — browser Supabase client for Auth only.
- Create: `frontend/lib/api-client.ts` — typed FastAPI client with Bearer token handling.
- Create: `frontend/lib/types.ts` — API response types matching FastAPI schemas.
- Create: `frontend/components/predictions/...` — upload, result, confidence, history, and error components.
- Create: `frontend/components/layout/...` — marketing and application shells.
- Create: `frontend/tests/` — component and route-flow tests.
- Create: `frontend/.env.example` — public Supabase and API URL variables.

### Project operations and documentation

- Create: `docker-compose.yml` — local FastAPI and frontend orchestration; Supabase remains hosted unless local Supabase is explicitly added later.
- Create: `README.md` — setup, training artifact acquisition, local development, testing, and deployment.
- Create: `docs/system-architecture.md` — final architecture and request flow.
- Create: `docs/model-evaluation.md` — reproducible evaluation report.
- Create: `docs/project-requirements.md` — functional and non-functional requirements.

---

### Task 1: Package and Verify the Original 38-Class Model

**Files:**
- Create: `backend/tools/convert_legacy_h5.py`
- Create: `backend/models/labels.json`
- Create: `backend/models/preprocessing.json`
- Create: `backend/models/metrics.json`
- Create: `backend/models/MODEL_CARD.md`
- Generate: `backend/models/plant_disease_model.keras`
- Reference: `Plant_Village_Detection_Model.h5` (original, unchanged)
- Test: `backend/tests/test_model_contract.py`

**Interfaces:**
- Produces a 38-output model and canonical `labels.json` whose indexes exactly match the model output indexes (recovered from the notebook's `train_gen.class_indices` output).
- Produces `preprocessing.json` with `image_size: [224, 224]`, RGB input, `nearest` resize, `/255` scaling, the internal-rescaling note, and model version.
- Produces `metrics.json` with dataset split description, notebook-reported metrics explicitly marked as not independently reproduced, and the provisional selected thresholds.
- Produces a loadable Keras model accepted by `ModelPredictor` in Task 3.

- [ ] **Step 1: Write failing model-contract tests**

Create tests that assert:

```python
def test_labels_have_38_contiguous_indexes():
    labels = load_labels("backend/models/labels.json")
    assert len(labels) == 38
    assert sorted(map(int, labels)) == list(range(38))


def test_model_output_matches_label_count():
    model = load_model("backend/models/plant_disease_model.keras")
    assert model.output_shape[-1] == 38


def test_preprocessing_contract_is_explicit():
    config = load_json("backend/models/preprocessing.json")
    assert config["image_size"] == [224, 224]
    assert config["color_mode"] == "rgb"
    assert config["resize"]["interpolation"] == "nearest"
    assert config["scaling"]["mode"] == "divide_by_255"
    assert "internal_model_preprocessing" in config
```

The tests initially fail because the generated assets do not exist.

- [ ] **Step 2: Run the contract tests and verify the expected missing-artifact failure**

Run: `pytest backend/tests/test_model_contract.py -v`

Expected: FAIL because the model package has not been generated yet.

- [ ] **Step 3: Implement the reproducible conversion and metadata packaging**

In `backend/tools/convert_legacy_h5.py`:

- Read `model_config` from `Plant_Village_Detection_Model.h5`.
- Apply the minimal structural fix (unwrap single `input_layers`/`output_layers` references) that Keras 3.12 requires; the original file must not be modified.
- Rebuild the model from the stored config and re-assign **every** weight matched by name against the original file; fail if any key, shape, or value differs.
- Assert a 38-unit softmax output, run a smoke prediction, save `backend/models/plant_disease_model.keras`, reload it, and confirm the round trip is identical.

Alongside it, generate:

- `labels.json` — the 38 class folders in the notebook's `class_indices` order.
- `preprocessing.json` — the contract in §9.1.2 of the design spec (nearest resize, divide-by-255, internal rescaling note, EXIF handling).
- `metrics.json` — notebook-reported train/validation metrics, dataset split sizes, known evaluation weaknesses, and provisional `uncertain`/`high` thresholds pending calibration.
- `MODEL_CARD.md` — provenance, intended use, limitations, responsible-use notice, and threshold status.

- [ ] **Step 4: Run the conversion and verification**

Run: `python backend/tools/convert_legacy_h5.py`

Expected: weight counts match, all weights verified by name/shape/value, 38-class smoke prediction valid, `.keras` written and reload-identical. If the original `.h5` is missing, stop and document the missing prerequisite rather than fabricating assets.

- [ ] **Step 5: Run the contract tests again**

Run: `pytest backend/tests/test_model_contract.py -v`

Expected: PASS for label count, output count, and preprocessing contract.

- [ ] **Step 6: Commit the packaging assets**

Commit conversion code, metadata, and tests only. Do not commit either model binary (both are `.gitignore`d).

```bash
git add backend/tools backend/models/labels.json backend/models/preprocessing.json backend/models/metrics.json backend/models/MODEL_CARD.md backend/tests/test_model_contract.py
git commit -m "feat: package and verify original plant disease model"
```

---

### Task 2: Create Supabase Schema, Seed Data, and Access Policies

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/seed.sql`
- Create: `supabase/README.md`
- Test: `supabase/tests/schema-check.sql` or documented Supabase SQL checks

**Interfaces:**
- Produces tables for `profiles`, `disease_information`, `model_versions`, `predictions`, and `prediction_feedback`.
- `predictions.disease_information_id` is nullable for uncertain results and foreign-keys to `disease_information.id`.
- `predictions.model_version_id` foreign-keys to `model_versions.id`; the model version row preserves the model metadata used for the prediction.
- `predictions.user_id` and `prediction_feedback.user_id` are owned by `auth.users.id`.
- Creates private Storage bucket `prediction-images`.

- [ ] **Step 1: Write schema checks for the ownership and relationship contract**

Checks must verify:

- All five tables exist.
- `predictions.user_id` references `auth.users`.
- `predictions.disease_information_id` and `model_version_id` are nullable/foreign-keyed as defined.
- `prediction_feedback` has a unique `(prediction_id, user_id)` constraint.
- RLS is enabled on user-owned tables.
- The storage bucket is private.

- [ ] **Step 2: Implement the migration**

Create UUID primary keys, timestamps, indexes on `(user_id, created_at)`, unique disease and model-version keys, JSONB `top_predictions`, and constraints for confidence values from 0 to 1. Add RLS policies for user-owned reads/inserts/deletes and server-managed admin/researcher operations. Use a documented server-side ownership check because the FastAPI service role bypasses RLS for controlled storage/database operations.

- [ ] **Step 3: Seed all 38 class mappings and model metadata**

Seed `disease_information` from the generated `labels.json`. Store human-readable plant/disease names separately from the raw model label. Seed the verified model version, dataset name, evaluation metrics, and model card reference. Do not invent treatment claims; mark incomplete disease content for later review.

- [ ] **Step 4: Apply the migration and seed in a Supabase project**

Run the documented Supabase CLI or SQL editor commands. Verify the schema checks pass and verify that an anonymous client cannot read private predictions or storage objects.

- [ ] **Step 5: Commit the schema package**

```bash
git add supabase
git commit -m "feat: add Supabase schema and access policies"
```

---

### Task 3: Build the FastAPI Model and Upload Core

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/config.py`
- Create: `backend/app/ml/model_metadata.py`
- Create: `backend/app/ml/preprocessing.py`
- Create: `backend/app/ml/predictor.py`
- Create: `backend/app/schemas/prediction.py`
- Create: `backend/app/api/health.py`
- Create: `backend/app/main.py`
- Create: `backend/.env.example`
- Test: `backend/tests/test_preprocessing.py`
- Test: `backend/tests/test_predictor.py`
- Test: `backend/tests/test_health.py`

**Interfaces:**

```python
class PredictionResult(BaseModel):
    plant: str
    condition: str
    confidence: float
    confidence_state: Literal["high", "review_recommended", "uncertain"]
    top_predictions: list[TopPrediction]
    model_version: str

class ModelPredictor:
    def predict(self, image_bytes: bytes) -> PredictionResult: ...
```

- [ ] **Step 1: Write failing preprocessing and predictor tests**

Tests must cover:

```python
def test_preprocess_returns_224_rgb_float_tensor(): ...
def test_corrupt_bytes_raise_invalid_image_error(): ...
def test_predict_returns_top_three_sorted_predictions(): ...
def test_low_score_returns_uncertain(): ...
def test_predictor_rejects_label_count_mismatch(): ...
```

Use a fake model in predictor unit tests so tests do not require TensorFlow inference for every API test.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `pytest backend/tests/test_preprocessing.py backend/tests/test_predictor.py -v`

Expected: FAIL because the modules and interfaces do not exist.

- [ ] **Step 3: Implement the model contract and preprocessing**

`model_metadata.py` loads the model path, labels, preprocessing metadata, metrics, and model version from environment/configured paths. Fail fast at startup when the model output count is not 38, labels are not contiguous, or preprocessing metadata is incomplete.

`preprocessing.py` decodes bytes with Pillow, converts to RGB, resizes to 224×224 using the documented policy, and applies exactly the normalization recorded in `preprocessing.json`. Reject corrupt images and enforce configured byte/dimension limits before TensorFlow receives input.

`predictor.py` loads the model once, computes probabilities, sorts the top three, maps indexes through `labels.json`, splits the raw label into human-readable plant/condition fields, and assigns the threshold-based confidence state from `metrics.json`.

- [ ] **Step 4: Implement health and readiness endpoints**

Create:

```text
GET /health/live
GET /health/ready
```

Liveness returns process health. Readiness returns failure if required model assets cannot load. Do not report the service ready with a missing or invalid model.

- [ ] **Step 5: Run focused tests and type/lint checks**

Run:

```bash
pytest backend/tests/test_preprocessing.py backend/tests/test_predictor.py backend/tests/test_health.py -v
ruff check backend
mypy backend/app
```

Expected: PASS. If the project selects different Python tooling, document the equivalent commands in `backend/README.md`.

- [ ] **Step 6: Commit the inference core**

```bash
git add backend
 git commit -m "feat: add FastAPI model inference core"
```

---

### Task 4: Add FastAPI Authenticated API and Supabase Services

**Files:**
- Create: `backend/app/dependencies.py`
- Create: `backend/app/services/prediction_service.py`
- Create: `backend/app/services/storage_service.py`
- Create: `backend/app/services/disease_service.py`
- Create: `backend/app/services/feedback_service.py`
- Create: `backend/app/api/predictions.py`
- Create: `backend/app/api/diseases.py`
- Create: `backend/app/api/feedback.py`
- Create: `backend/app/api/profiles.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_auth.py`
- Test: `backend/tests/test_predictions_api.py`
- Test: `backend/tests/test_ownership.py`

**Interfaces:**

```text
GET    /api/v1/me
GET    /api/v1/diseases
GET    /api/v1/diseases/{disease_id}
POST   /api/v1/predictions
GET    /api/v1/predictions
GET    /api/v1/predictions/{prediction_id}
DELETE /api/v1/predictions/{prediction_id}
POST   /api/v1/predictions/{prediction_id}/feedback
```

The browser sends `Authorization: Bearer <Supabase access token>`. FastAPI verifies the token with Supabase Auth and obtains the authenticated user ID. All database and storage operations receive that user ID and enforce ownership. The Supabase service-role key is server-only and never returned to the frontend.

- [ ] **Step 1: Write failing API and ownership tests**

Cover:

```python
def test_missing_bearer_token_returns_401(): ...
def test_invalid_token_returns_401(): ...
def test_prediction_upload_rejects_non_image(): ...
def test_prediction_upload_rejects_oversized_file(): ...
def test_prediction_is_persisted_with_authenticated_user_id(): ...
def test_user_cannot_read_another_users_prediction(): ...
def test_user_cannot_delete_another_users_prediction(): ...
def test_low_confidence_result_is_persisted_as_uncertain(): ...
def test_feedback_is_unique_per_user_and_prediction(): ...
```

Mock Supabase and the predictor at the service boundary; use an integration test profile for a real Supabase project separately.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pytest backend/tests/test_auth.py backend/tests/test_predictions_api.py backend/tests/test_ownership.py -v`

Expected: FAIL because the routes and dependencies do not exist.

- [ ] **Step 3: Implement auth dependency and API schemas**

Implement a reusable `get_current_user()` dependency that extracts and verifies a Bearer token. Define consistent error codes for `UNAUTHENTICATED`, `INVALID_IMAGE`, `IMAGE_TOO_LARGE`, `PREDICTION_NOT_FOUND`, `MODEL_UNAVAILABLE`, and `INTERNAL_ERROR` without exposing stack traces.

- [ ] **Step 4: Implement storage and prediction transaction workflow**

For `POST /api/v1/predictions`:

1. Authenticate the user.
2. Validate content type, decoded image, byte size, and dimensions.
3. Run inference before creating the durable prediction record.
4. Upload the image to a user-scoped private path such as `{user_id}/{prediction_id}.jpg`.
5. Insert the prediction with `user_id`, `model_version_id`, nullable `disease_information_id`, confidence data, top predictions, and inference time.
6. If database persistence fails after upload, delete the uploaded object as compensation.
7. Return the structured prediction without exposing a permanent public URL.

For detail/history responses, return a short-lived signed URL only after ownership is verified, or omit the image URL when not requested. Delete removes the prediction and its private image according to the retention policy.

- [ ] **Step 5: Implement disease, profile, and feedback routes**

Expose the 38 supported classes and disease information. Keep uncertain predictions valid with no disease-information foreign key. Permit one feedback row per user/prediction and return a conflict for a duplicate unless an update behavior is explicitly added.

- [ ] **Step 6: Run backend tests and checks**

Run:

```bash
pytest backend/tests -v
ruff check backend
mypy backend/app
```

Expected: PASS, including cross-user access denial and compensation behavior.

- [ ] **Step 7: Commit the authenticated API**

```bash
git add backend
 git commit -m "feat: add authenticated prediction API"
```

---

### Task 5: Scaffold Next.js, Supabase Auth, and Typed API Client

**Files:**
- Create: `frontend/` Next.js application
- Create: `frontend/lib/supabase/browser.ts`
- Create: `frontend/lib/api-client.ts`
- Create: `frontend/lib/types.ts`
- Create: `frontend/middleware.ts` or the current Next.js session-protection equivalent
- Create: `frontend/.env.example`
- Test: `frontend/tests/auth-flow.test.tsx`
- Test: `frontend/tests/api-client.test.ts`

**Interfaces:**

```typescript
type PredictionResponse = {
  id: string;
  plant: string;
  condition: string;
  confidence: number;
  confidenceState: "high" | "review_recommended" | "uncertain";
  topPredictions: Array<{ condition: string; score: number }>;
  modelVersion: string;
  createdAt: string;
};

apiClient.createPrediction(file: File): Promise<PredictionResponse>;
apiClient.listPredictions(): Promise<PredictionSummary[]>;
```

- [ ] **Step 1: Write failing auth/client tests**

Assert that authenticated requests include the current Supabase access token, unauthenticated requests redirect or return a controlled auth state, and API error payloads become user-safe messages.

- [ ] **Step 2: Scaffold the Next.js App Router application**

Create the `frontend` app with TypeScript, route groups, strict environment validation, and the existing design system decision for the product UI. Do not place Supabase service-role secrets in frontend variables.

- [ ] **Step 3: Implement Supabase browser Auth client and session protection**

Support sign-up, sign-in, sign-out, email verification state, forgot-password, and reset-password flows. Protect `(app)` routes and leave `(marketing)` public.

- [ ] **Step 4: Implement typed FastAPI client**

Use the browser Supabase session to attach the access token to FastAPI requests. Handle `401`, validation errors, uncertain results, and server failures with typed results.

- [ ] **Step 5: Run frontend tests and checks**

Run:

```bash
npm test
npm run typecheck
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit frontend foundation**

```bash
git add frontend
 git commit -m "feat: scaffold frontend auth and API client"
```

---

### Task 6: Build Public Marketing and Supported-Class Pages

**Files:**
- Create: `frontend/app/(marketing)/page.tsx`
- Create: `frontend/app/(marketing)/about/page.tsx`
- Create: `frontend/app/(marketing)/how-it-works/page.tsx`
- Create: `frontend/app/(marketing)/supported-plants/page.tsx`
- Create: `frontend/app/(marketing)/research/page.tsx`
- Create: `frontend/app/(marketing)/contact/page.tsx`
- Create: `frontend/app/(marketing)/privacy/page.tsx`
- Create: `frontend/app/(marketing)/terms/page.tsx`
- Create/modify: marketing layout and navigation components
- Test: `frontend/tests/marketing-pages.test.tsx`

**Interfaces:**
- The supported-plants page consumes `GET /api/v1/diseases` or a generated static manifest from the same `labels.json` source.
- Marketing copy must state that the system supports all 38 verified classes and that predictions are AI-assisted estimates.

- [ ] **Step 1: Write failing page tests**

Assert that the home page contains the upload CTA, the supported-class page renders the 38-class list, and terms/limitations contain the responsible-use disclaimer.

- [ ] **Step 2: Implement the marketing shell and pages**

Build responsive pages with clear navigation to sign-in and the application. Keep model methodology factual: EfficientNetB3, PlantVillage-style dataset, packaging/evaluation process, and known field-image limitations.

- [ ] **Step 3: Run page tests and browser checks**

Run: `npm test -- marketing-pages`

Expected: PASS. Manually verify mobile and desktop layout at the supported browser widths.

- [ ] **Step 4: Commit marketing pages**

```bash
git add frontend
 git commit -m "feat: add marketing and supported-class pages"
```

---

### Task 7: Build Authenticated Prediction Application

**Files:**
- Create: `frontend/app/(app)/layout.tsx`
- Create: `frontend/app/(app)/dashboard/page.tsx`
- Create: `frontend/app/(app)/predict/page.tsx`
- Create: `frontend/app/(app)/predictions/[id]/page.tsx`
- Create: `frontend/app/(app)/history/page.tsx`
- Create: `frontend/app/(app)/profile/page.tsx`
- Create: `frontend/components/predictions/ImageUpload.tsx`
- Create: `frontend/components/predictions/PredictionResult.tsx`
- Create: `frontend/components/predictions/ConfidenceBadge.tsx`
- Create: `frontend/components/predictions/PredictionHistory.tsx`
- Create: `frontend/components/predictions/PredictionError.tsx`
- Test: `frontend/tests/prediction-flow.test.tsx`

**Interfaces:**
- Upload screen accepts one image per prediction in the first release.
- Result screen displays plant, condition, confidence state, top three predictions, model version, timestamp, disease information when available, and responsible-use notice.
- Low-confidence output displays `uncertain` and does not present treatment content as a confirmed diagnosis.

- [ ] **Step 1: Write failing UI-flow tests**

Cover:

```typescript
test("rejects unsupported client file before upload", ...);
test("shows loading state during prediction", ...);
test("renders high-confidence result and alternatives", ...);
test("renders uncertain state without definitive treatment language", ...);
test("renders API failure with retry guidance", ...);
test("history only renders the current user's API response", ...);
```

- [ ] **Step 2: Implement upload validation and prediction flow**

Validate file type/size on the client for user feedback, but rely on FastAPI validation for security. Show image preview, clear upload guidance, progress/loading state, validation errors, and retry behavior.

- [ ] **Step 3: Implement result and disease-information presentation**

Render raw model confidence as project-defined confidence information, not as a guarantee. Show alternatives, version, timestamp, and reviewed disease information only when the API supplies a linked record.

- [ ] **Step 4: Implement dashboard, history, detail, delete, and profile pages**

Use paginated or bounded history queries, confirm destructive deletion, and refresh state after deletion. Do not render another user's data even if an API response is tampered with; route-level authorization remains a backend responsibility.

- [ ] **Step 5: Run frontend tests and checks**

Run:

```bash
npm test -- prediction-flow
npm run typecheck
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit the application UI**

```bash
git add frontend
 git commit -m "feat: add plant disease prediction application"
```

---

### Task 8: Integration, Security, Deployment, and Documentation

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `README.md`
- Create: `docs/system-architecture.md`
- Create: `docs/model-evaluation.md`
- Create: `docs/project-requirements.md`
- Modify: backend/frontend environment examples and deployment configuration
- Test: `backend/tests/test_integration.py`
- Test: `frontend/tests/e2e/prediction.spec.ts`

**Interfaces:**
- Local command starts frontend and FastAPI with documented environment variables.
- End-to-end path is: sign in → upload fixture → FastAPI inference → Supabase persistence → result display → history display.
- Production readiness requires model readiness, Supabase policies, private storage, and configured CORS.

- [ ] **Step 1: Write the end-to-end test**

Use a seeded test account and a known fixture image. Assert that the response is persisted, the result page displays the prediction, and the history page lists it. Add a second user assertion that the first user's record is inaccessible.

- [ ] **Step 2: Implement local orchestration**

Add Docker Compose for FastAPI and frontend. Document Supabase hosted-project variables, model artifact placement, startup order, and health checks. Do not put secrets in Compose or source control.

- [ ] **Step 3: Implement production configuration**

Configure CORS to the frontend origin, request/file limits, structured logging without image contents or tokens, readiness checks, and a deployment command compatible with the selected Python host. Keep model loading at process startup and document CPU/RAM requirements.

- [ ] **Step 4: Run the complete verification suite**

Run:

```bash
pytest backend/tests -v
npm test
npm run typecheck
npm run lint
# Run the end-to-end test against a configured test environment
```

Expected: all tests pass, the model loads, the frontend can authenticate, and the end-to-end prediction is persisted and displayed.

- [ ] **Step 5: Complete the academic and operational documentation**

Document architecture, data flow, model methodology, metrics, limitations, supported classes, threat/privacy considerations, setup, deployment, and demonstration steps. Explicitly distinguish validation/test metrics from field performance.

- [ ] **Step 6: Perform the release review**

Verify the acceptance criteria from the design spec, run a manual security check of cross-user access and private image URLs, verify licensing notes for the dataset/model/weights, and record any limitations that prevent a production claim.

- [ ] **Step 7: Commit the integrated release documentation and deployment setup**

```bash
git add docker-compose.yml README.md docs backend frontend
 git commit -m "chore: integrate and document plant disease system"
```

---

## Execution Notes

- The model artifact prerequisite is satisfied: the original `Plant_Village_Detection_Model.h5` is packaged and weight-verified. The dataset is still required for *independent evaluation and threshold calibration*; until it is available, metrics remain notebook-reported and the plan must not invent independently reproduced numbers.
- The first release intentionally supports one image per prediction. Multi-image analysis, PDF reports, admin editing, and a separate model service remain follow-up work unless explicitly added to scope.
- If the packaged model fails the reality-check evaluation, keep the application architecture but activate the retraining fallback (or revise the model scope, dataset, or user-facing claim) before release; do not hide the result.
- The implementation preserves the original notebook and `.h5` as research references; reproducible packaging lives in `backend/tools/`, and any future retraining lives in `training/`.
