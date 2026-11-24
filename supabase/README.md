# Supabase database package

This directory is the reproducible schema package for Leafwise. It creates
the five application tables, their triggers, safe Row Level Security (RLS)
policies, the private `prediction-images` bucket, and all 38 model-label
mappings.

## Contents

- [Schema overview](#schema-overview)
- [Apply through the Supabase SQL Editor](#apply-through-the-supabase-sql-editor)
- [Backend environment](#backend-environment)
- [Verify the running API](#verify-the-running-api)
- [Security model](#security-model)

## Schema overview

### Tables

| Table | Purpose | Who can read | Who can write |
| --- | --- | --- | --- |
| `profiles` | 1:1 with `auth.users` — display name, role | owner only | owner (name only), service role |
| `model_versions` | reference data: which model produced predictions (version, metrics, model card path) | public | service role / migration only |
| `disease_information` | the 38 classes: `class_index`, `model_label`, plant/disease names, symptoms, prevention, treatment notes | public | migration only (content is expert-reviewed) |
| `predictions` | one row per scan: owner, image path, top result, `confidence`, `confidence_state`, `top_predictions` (JSON array), model version, inference time | owner only | owner (insert/delete), service role |
| `prediction_feedback` | one row per user + prediction: was the result correct? + optional comment (≤ 2000 chars) | owner only | owner (insert/delete), service role |

```text
auth.users ──1:1── profiles
     │
     ├──∞ predictions ──1:1── prediction_feedback
     │      │
     │      ├──?── disease_information   (trigger-linked; NULL when "uncertain")
     │      └──1── model_versions
     └── public read: disease_information, model_versions
```

### Notable columns and constraints

- `predictions.image_path` **must** start with the owner's UUID
  (`<user-uuid>/…`) — enforced by a `check` constraint, so a mis-scoped path
  can never be inserted, not even by the service role.
- `confidence` ∈ [0, 1]; `confidence_state` ∈ `high | review_recommended |
  uncertain`.
- `prediction_feedback` is `unique (prediction_id, user_id)` — one opinion
  per scan (the API returns `409 FEEDBACK_EXISTS` otherwise).
- Indexes: `predictions (user_id, created_at desc)` powers history;
  feedback is indexed the same way.

### Triggers (in the `private` schema, not exposed via the Data API)

| Trigger | Fires | What it does |
| --- | --- | --- |
| `create_profile_for_new_user` | after insert on `auth.users` | auto-creates the user's `profiles` row (with backfill for pre-existing users) |
| `resolve_prediction_relationships` | before insert/update on `predictions` | resolves `model_version` and `plant_name`/`disease_name` into foreign keys in one authoritative place; **deliberately leaves `disease_information_id` NULL for `uncertain` results** so no treatment text is linked to a guess |
| `set_row_updated_at` | before update on `profiles`, `disease_information` | maintains `updated_at` |

### Row Level Security

Every table has RLS enabled. Summary of policies:

- **Owner-only** for `profiles`, `predictions`, `prediction_feedback`
  (`auth.uid() = user_id`).
- **Public read** for `disease_information` and `model_versions`.
- `prediction_feedback` inserts additionally require that the referenced
  prediction belongs to the same user.
- Storage policies mirror the object layout: you may only select/insert/
  delete objects under **your own UUID folder**.

> The backend uses the service-role key, which **bypasses RLS by design** —
> so FastAPI independently re-applies `user_id` filters to every user-owned
> query before returning data or signing an image URL.

### Storage

- Bucket `prediction-images` — **private**, 5 MB file limit, JPEG/PNG/WEBP
  only (all set in the bucket definition, so uploads are rejected even if the
  API layer is bypassed).
- Object keys: `<user-uuid>/<prediction-id>-<filename>`.
- Clients never get permanent URLs — the API mints short-lived signed URLs
  per request.

## Apply through the Supabase SQL Editor

1. In the Supabase Dashboard, open **SQL Editor** → **New query**.
2. Paste and run the entire contents of
   [`migrations/001_initial_schema.sql`](migrations/001_initial_schema.sql).
3. Open another query, paste and run the entire contents of
   [`seed.sql`](seed.sql).
4. Open one final query, paste and run
   [`tests/schema-check.sql`](tests/schema-check.sql).

The final query must return:

```text
Supabase schema check passed | 38 | 1
```

The migration is designed to be safe to re-run. The seed preserves any future
expert-reviewed disease content; it only refreshes the immutable class mapping.

> Applying this yourself? Follow the full walkthrough in
> [docs/getting-started.md](../docs/getting-started.md) — it covers project
> creation, keys, and env files in order.

## Backend environment

Use a **server-only Secret key** (`sb_secret_...`) from **Project Settings →
API Keys**. The backend's existing environment-variable name remains
`SUPABASE_SERVICE_ROLE_KEY`, but it must contain the secret key, not the
browser-safe `sb_publishable_...` key:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_JWT_SECRET=your-project-jwt-secret
```

Never place the secret key in frontend code, source control, a screenshot, or
chat. The backend uses it only on the server and still filters every prediction
query by `user_id` before returning data or signing an image URL.

## Verify the running API

After updating `backend/.env`, start the API from `backend/`:

```bash
python -m uvicorn app.main:app --env-file .env --port 8000
```

Then the public catalog should succeed without a Bearer token:

```bash
curl http://127.0.0.1:8000/api/v1/diseases
```

Expected result: HTTP `200` and JSON containing `"count": 38`.

For prediction persistence, sign in with a real Supabase Auth user and pass its
access token as `Authorization: Bearer <access-token>`. The database trigger
automatically links normal/high-confidence results to the seeded disease row,
links every result to the seeded model version, and intentionally leaves
`disease_information_id` null for `uncertain` results.

## Security model

- `prediction-images` is private; it accepts JPEG, PNG, and WEBP up to 5 MB.
- Storage object paths must begin with the authenticated user's UUID
  (enforced both by RLS policy and a table `check` constraint).
- Users can select/insert/delete only their own predictions and feedback.
- Anonymous users can read only the public disease/model reference data.
- The backend secret key bypasses RLS by design, so FastAPI independently
  applies owner filters to every user-owned query.
- Trigger functions live in a non-exposed `private` schema with explicit,
  minimal grants.

Full security architecture: [docs/architecture.md §6](../docs/architecture.md).
