# AI-Assisted Plant Disease Classification System — Design

**Date:** 2026-11-18  
**Status:** Final design approved; implementation not started  
**Project type:** Final-year student project

## 1. Intent

Build a web-based, AI-assisted plant disease classification system that allows an authenticated user to upload a plant image, receive a likely plant/disease classification with confidence information, review the result, and access previous predictions.

The system is an educational and decision-support tool. It must not present an image-based prediction as a guaranteed agricultural diagnosis or automatically prescribe pesticides.

The current research asset is `plant-village-detection-99-54-accuracy.ipynb`. It trains and evaluates an EfficientNetB3-based classifier using the New Plant Diseases / PlantVillage-style dataset and reports 38 classes. The original trained model file is not available, so the project will retrain the EfficientNetB3 model from the notebook workflow, correct the evaluation process, and package the newly generated model with its label mapping, preprocessing configuration, and evaluation report. The notebook remains a research/training artifact, not the application runtime.

## 2. Confirmed technology choices

| Area | Decision |
| --- | --- |
| Frontend | Next.js with the App Router and TypeScript |
| Frontend structure | Separate marketing pages and authenticated application pages using route groups |
| Backend | FastAPI with Python |
| Machine learning | TensorFlow/Keras; EfficientNetB3 baseline from the notebook |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Image storage | Supabase Storage |
| Local development | Docker Compose where practical |
| Deployment direction | Vercel for frontend; a Python-capable service such as Render/Railway/Fly.io for FastAPI; Supabase-managed database, Auth, and Storage |

The first release will use **one FastAPI service** for application APIs and model inference. A separate model service is intentionally deferred because it would add operational complexity without a demonstrated need for this student project.

### Confirmed model scope

The first release supports **all 38 classes** represented in the notebook dataset, including healthy classes. The application will not hide classes from the model output. The canonical `labels.json` generated during retraining is the single source of truth for model-index-to-label mapping and will be used to seed the supported-classes and disease-information records.

## 3. Goals

1. Provide a usable web interface for plant image upload and prediction.
2. Retrain and verify an EfficientNetB3 classifier for all 38 classes represented in the notebook dataset.
3. Package and serve the newly trained TensorFlow/Keras model through FastAPI.
4. Store users, prediction records, feedback, and disease information in Supabase.
5. Secure authenticated operations and ensure users can access only their own prediction history.
6. Show prediction confidence and top alternatives rather than only one unexplained label.
7. Return an explicit uncertain/unsupported result when the prediction is below the confidence threshold.
8. Preserve model version, dataset, and evaluation metadata for every prediction.
9. Provide enough system documentation for an academic report, demonstration, and future maintenance.

## 4. Non-goals for the first release

- Guaranteed agricultural diagnosis.
- Automatic pesticide prescriptions or legally authoritative treatment advice.
- Crop-yield prediction or weather forecasting.
- Multi-disease localization or lesion segmentation.
- Fully offline mobile inference.
- Replacing an agronomist or plant pathologist.
- Supporting arbitrary crops and diseases outside the verified model classes.
- Building a separate model microservice before scale or latency requirements justify it.

## 5. Anti-goals and failure conditions

The project is considered unsuccessful if it:

- Claims the notebook's validation accuracy as universal real-world accuracy.
- Always returns a confident disease label for unrelated, blurry, or unsupported images.
- Allows one user to read another user's uploaded images or prediction records.
- Uses an undocumented class order or mismatched preprocessing between training and inference.
- Gives treatment instructions without reviewed disease-information content and source attribution.
- Depends on the notebook being executed inside the production request path.

## 6. Approaches considered

### Approach A — One FastAPI backend with model inference (selected)

Next.js calls FastAPI. FastAPI verifies the Supabase session, validates the upload, invokes the TensorFlow model, stores the result, and returns a response. Supabase provides PostgreSQL, Auth, and Storage.

**Why selected:** It is the simplest complete architecture, keeps the model native to Python, minimizes local and deployment complexity, and is easy to explain in a final-year project.

### Approach B — FastAPI application API plus separate Python model service

A general API service calls an internal inference service.

**Trade-off:** Better independent scaling and model isolation, but it introduces a second service, network failure modes, extra configuration, and more deployment work. It is deferred until measurements show it is needed.

### Approach C — Full Java backend with converted model

Convert the Keras model to ONNX or another Java-compatible format and run inference in Java.

**Trade-off:** This would satisfy a Java-only constraint but creates conversion and preprocessing compatibility risks. It is not selected because the confirmed project direction allows Python and the model already runs natively in Python.

## 7. High-level architecture

```text
┌─────────────────────────────────────────────┐
│ Next.js frontend                            │
│                                             │
│  Marketing route group                      │
│  Auth route group                           │
│  Dashboard/application route group         │
└──────────────────────┬──────────────────────┘
                       │ HTTPS + Supabase session
                       ▼
┌─────────────────────────────────────────────┐
│ FastAPI backend                             │
│                                             │
│  Auth verification                          │
│  Upload validation                           │
│  Prediction API                              │
│  History and feedback API                    │
│  Disease information API                     │
│  Model loading and inference                 │
└───────────────┬───────────────┬─────────────┘
                │               │
                ▼               ▼
┌───────────────────────┐ ┌───────────────────┐
│ Supabase               │ │ TensorFlow/Keras  │
│ PostgreSQL             │ │ EfficientNetB3    │
│ Auth                   │ │ packaged model   │
│ Storage                │ │ + labels/config  │
└───────────────────────┘ └───────────────────┘
```

The browser communicates with FastAPI for protected application operations. Supabase Auth is the identity provider. The model file is loaded once when the FastAPI process starts, rather than loaded for every request.

## 8. Frontend design

### 8.1 Marketing pages

The public route group will include:

- Home
- About the system
- How it works
- Supported plants and diseases
- Research/methodology
- Contact
- Privacy policy
- Terms, limitations, and responsible-use notice

These pages explain that the system provides an AI-assisted classification, identify the supported classes, and state that results should be confirmed by a qualified professional when decisions have meaningful agricultural consequences.

### 8.2 Authentication pages

- Sign up
- Sign in
- Email verification state
- Forgot password
- Reset password
- Authenticated session loading/error states

Supabase Auth will manage credentials and sessions. The application will not store plaintext passwords.

### 8.3 Application pages

- Dashboard overview
- Upload/capture image screen
- Image preview and quality guidance
- Prediction result
- Prediction history
- Prediction detail
- User profile/settings
- Optional feedback form

The upload flow should explain image guidance before submission: use a clear leaf image, good lighting, one main subject, and avoid severe blur. The interface must support loading, validation failure, unsupported image, model failure, and low-confidence states.

### 8.4 Prediction result presentation

A result should contain:

- Plant name
- Predicted condition/disease
- Human-readable confidence percentage
- Confidence state: high, review recommended, or uncertain
- Top alternative predictions
- Model version
- Prediction timestamp
- Link to reviewed disease information, where available
- Responsible-use notice

The UI must not imply that a probability is a clinically or agriculturally calibrated certainty. The word “confidence” should be accompanied by the project’s explanation of its meaning.

## 9. Machine-learning design

### 9.1 Baseline model and retraining decision

The notebook's final model is the EfficientNetB3-based model created after the initial custom CNN. It has a 38-class softmax output and is saved in the notebook with an H5 filename. Because the original trained file is unavailable, the project will **retrain the model** rather than search for or depend on an unverified prebuilt artifact.

The retraining workflow will:

1. Acquire the authorized New Plant Diseases / PlantVillage-style dataset in the training environment.
2. Recreate the 38-class manifest from the dataset directories.
3. Create deterministic train, validation, and labeled test handling.
4. Reproduce the EfficientNetB3 transfer-learning architecture as a documented baseline.
5. Use documented augmentation only for training.
6. Save the best checkpoint based on validation performance.
7. Evaluate the final checkpoint on a held-out labeled test set.
8. Export the model in the format selected for the runtime, preferably `.keras` after loading verification.
9. Save the exact class ordering, preprocessing configuration, model metadata, and metrics next to the model.

The notebook may be cleaned up or used as the starting point for a dedicated training script, but it must not be executed inside the production request path.

The retraining output must produce and version these assets:

```text
backend/models/
├── plant_disease_model.keras
├── labels.json
├── preprocessing.json
├── metrics.json
└── MODEL_CARD.md
```

The model artifact is generated during Phase 2 and is not committed to the source repository unless its size and licensing permit it. If it is stored externally, the model download/version process must be documented and reproducible.

### 9.2 Required model verification before integration

Before using the model in the application:

1. Create a deterministic evaluation generator with `shuffle=False`.
2. Do not apply random augmentation to validation/test data.
3. Use a separately labeled test set. The notebook's 33-image unlabeled directory cannot produce test accuracy.
4. Calculate accuracy, macro precision, macro recall, macro F1, per-class metrics, and a confusion matrix.
5. Inspect class imbalance and identify classes with weak recall.
6. Verify that prediction ordering matches label ordering.
7. Verify the exact image resize, color mode, and normalization used in training.
8. Confirm whether EfficientNet's built-in preprocessing/rescaling is active; prevent double normalization.
9. Test on a small set of real-world photographs that were not generated from the same dataset.
10. Record the model version, dataset source, split method, metrics, and known limitations.

The reported `99.53%` is treated as a notebook validation result until independently reproduced. It must not be presented as production accuracy.

### 9.3 Runtime prediction behavior

The predictor should:

1. Accept an image file after validation.
2. Decode it safely and reject unsupported/corrupt files.
3. Enforce file size and image-dimension limits.
4. Apply the exact documented preprocessing.
5. Run one model prediction.
6. Sort probabilities and return the top three classes.
7. Apply a configured confidence threshold.
8. Return `uncertain` when the threshold is not met or when the image is outside the supported scope as far as the available safeguards can determine.
9. Include model version and inference time in the internal result.

The threshold is a project configuration value and must be selected using validation data rather than guessed from one example. It should be documented in the model card.

### 9.4 Disease-information content

Prediction labels and treatment content must remain separate. The model predicts a class; the `disease_information` table supplies reviewed explanatory content. Treatment/prevention text should be sourced and marked as educational guidance, not automatically generated prescriptions.

## 10. Backend design

### 10.1 FastAPI modules

```text
backend/app/
├── main.py
├── config.py
├── dependencies.py
├── api/
│   ├── health.py
│   ├── predictions.py
│   ├── history.py
│   ├── diseases.py
│   ├── feedback.py
│   └── profiles.py
├── schemas/
│   ├── prediction.py
│   ├── disease.py
│   └── profile.py
├── services/
│   ├── prediction_service.py
│   ├── storage_service.py
│   ├── disease_service.py
│   └── feedback_service.py
└── ml/
    ├── predictor.py
    ├── preprocessing.py
    ├── labels.json
    └── model_metadata.json
```

### 10.2 Initial API surface

```text
GET  /health
GET  /api/v1/me
POST /api/v1/predictions
GET  /api/v1/predictions
GET  /api/v1/predictions/{prediction_id}
DELETE /api/v1/predictions/{prediction_id}
POST /api/v1/predictions/{prediction_id}/feedback
GET  /api/v1/diseases/{disease_id}
```

`POST /api/v1/predictions` accepts a multipart image upload. The backend verifies the authenticated user, validates the file, stores the image in a private Supabase Storage bucket, invokes the model, stores the structured prediction, and returns the result.

### 10.3 Response shape

```json
{
  "id": "prediction-id",
  "plant": "Tomato",
  "condition": "Tomato late blight",
  "confidence": 0.94,
  "confidenceState": "review_recommended",
  "topPredictions": [
    {"condition": "Tomato late blight", "score": 0.94},
    {"condition": "Tomato early blight", "score": 0.03},
    {"condition": "Tomato leaf mold", "score": 0.01}
  ],
  "modelVersion": "plant-village-efficientnetb3-v1",
  "createdAt": "2026-11-18T00:00:00Z"
}
```

The API will use consistent error responses for invalid files, unauthenticated requests, unsupported images, model failures, and database/storage failures. Internal exception details must not be exposed to users.

## 11. Supabase design

### 11.1 Tables

#### `profiles`

- `id` — UUID, references `auth.users.id`
- `full_name`
- `role` — user/admin/researcher
- `created_at`
- `updated_at`

#### `predictions`

- `id`
- `user_id`
- `image_path`
- `plant_name`
- `disease_name`
- `confidence`
- `confidence_state`
- `top_predictions` — JSONB
- `model_version`
- `inference_ms`
- `created_at`

#### `disease_information`

- `id`
- `plant_name`
- `disease_name`
- `description`
- `symptoms`
- `prevention`
- `treatment_note`
- `source`
- `updated_at`

#### `prediction_feedback`

- `id`
- `prediction_id`
- `user_id`
- `is_correct`
- `comment`
- `created_at`

#### `model_versions`

- `id`
- `version`
- `model_name`
- `dataset_name`
- `validation_accuracy`
- `test_accuracy`
- `macro_f1`
- `notes`
- `created_at`

### 11.2 Security rules

- Enable Row Level Security on user-owned tables.
- Users may read, create, and delete only their own predictions and feedback.
- Admin/researcher permissions must be enforced server-side and through database policies where applicable.
- Keep the Supabase service-role key only on the server.
- Never expose the service-role key to Next.js client code.
- Use private image storage and signed URLs for viewing uploaded images.
- Validate file type by content where practical, not only by filename extension.
- Configure image size and request-rate limits.
- Delete storage objects when a prediction is deleted, subject to the project retention policy.

## 12. Model and application file structure

```text
AI-assisted plant disease classification system/
├── frontend/
├── backend/
│   ├── app/
│   ├── models/
│   │   ├── plant_disease_model.keras
│   │   ├── labels.json
│   │   ├── preprocessing.json
│   │   └── MODEL_CARD.md
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
│   ├── superpowers/
│   │   └── specs/
│   │       └── 2026-11-18-plant-disease-classification-design.md
│   ├── system-architecture.md
│   ├── model-evaluation.md
│   └── project-requirements.md
├── docker-compose.yml
└── README.md
```

The original notebook remains a research reference. Production inference must use the packaged model assets and documented runtime code.

## 13. Testing strategy

### Model tests

- Model loads successfully at service startup.
- Label count matches model output count.
- Preprocessing returns the expected tensor shape and range.
- Known fixture images return stable predictions within an accepted tolerance.
- Invalid/corrupt images are rejected.
- Low-confidence fixture behavior returns `uncertain`.

### Backend tests

- Health endpoint works without authentication.
- Protected routes reject missing/invalid sessions.
- Users cannot access other users' predictions.
- Upload size and content validation works.
- Prediction records and storage objects are created consistently.
- Model failures return safe API errors.
- Delete operations remove or correctly mark both record and image.

### Frontend tests

- Marketing navigation works.
- Authenticated and unauthenticated route behavior is correct.
- Upload loading, success, invalid-file, low-confidence, and failure states render correctly.
- Prediction history pagination/filtering works if implemented.
- Responsive layouts work on mobile and desktop.

### End-to-end test

A seeded test user uploads a known fixture image, FastAPI runs the model, Supabase stores the record, and the Next.js result page displays the persisted prediction.

## 14. Delivery phases

### Phase 1 — Requirements and project setup

- Create frontend and backend applications.
- Establish environment-variable conventions.
- Add repository documentation and local run instructions.
- Confirm supported crops/classes and user roles.

### Phase 2 — Model retraining and verification

- Acquire the authorized dataset in the training environment.
- Convert the notebook workflow into a reproducible training script or cleaned training notebook.
- Retrain the EfficientNetB3 model for all 38 classes.
- Correct validation/test evaluation.
- Save the best verified model checkpoint.
- Save labels and preprocessing configuration.
- Produce model card and metrics report.
- Test real-world sample images.
- Approve the model for integration only after the documented evaluation gate is met.

### Phase 3 — Supabase foundation

- Create Supabase project.
- Configure Auth.
- Create migrations and Row Level Security policies.
- Create private Storage bucket.
- Seed disease-information records.

### Phase 4 — FastAPI backend

- Implement configuration and health endpoint.
- Implement Supabase session verification.
- Package and load the model.
- Implement upload, prediction, history, detail, delete, and feedback APIs.
- Add unit and integration tests.

### Phase 5 — Next.js frontend

- Build marketing pages.
- Build authentication flows.
- Build dashboard and upload flow.
- Build result, history, and profile pages.
- Add loading, error, uncertainty, and responsible-use states.

### Phase 6 — Integration and quality

- Connect the frontend to FastAPI.
- Run end-to-end testing.
- Check security and data ownership.
- Measure inference latency and file-size behavior.
- Verify responsive and accessible UI.

### Phase 7 — Deployment and academic documentation

- Deploy frontend and backend.
- Configure production secrets.
- Verify Supabase RLS and private storage.
- Write system architecture, model methodology, evaluation, limitations, and user guide.
- Prepare demonstration scenarios and final presentation.

## 15. Open decisions to settle during implementation

These do not change the approved architecture, but must be decided before the corresponding phase:

1. Exact model artifact format: `.keras` preferred, `.h5` retained only if verified.
2. Confidence threshold selected from validation data.
3. Whether users can upload multiple images per prediction.
4. Image retention period and delete behavior.
5. Admin workflow for editing disease-information content.
6. Whether downloadable PDF reports are required for the final demonstration.
7. Deployment provider and free-tier limits.
8. Whether the client requires a mobile-responsive web application only or a later native mobile app.
9. Whether a separate, independently collected real-world test set is available for the final evaluation gate.

## 16. Acceptance criteria

The first complete release is acceptable when:

- A new user can register, sign in, and sign out.
- An authenticated user can upload a supported image.
- The backend runs the packaged model and returns a prediction without executing the notebook.
- The result shows the predicted class, confidence state, top alternatives, model version, and limitations.
- The prediction and private image are persisted in Supabase.
- The user can view and delete their own prediction history.
- A second user cannot access the first user's records or images.
- Low-confidence and invalid-image cases are handled explicitly.
- The model evaluation report distinguishes validation performance from real-world limitations.
- The frontend is responsive and the backend has automated tests for the critical flows.

## 17. Responsible-use and licensing notes

The project must document the source and license terms for the dataset, notebook, pretrained weights, and any disease-information references. The client delivery must comply with those terms.

The application should display a concise disclaimer that predictions are AI-assisted estimates, are limited to supported classes, and should be confirmed by an agricultural expert before treatment or financial decisions are made.
