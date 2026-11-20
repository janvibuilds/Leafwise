# Supabase setup

This directory is the reproducible schema package for the Plant Disease
Detection backend. It creates the five application tables, safe RLS policies,
the private `prediction-images` bucket, and all 38 model-label mappings.

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
- Storage object paths must begin with the authenticated user's UUID.
- Users can select/insert/delete only their own predictions and feedback.
- Anonymous users can read only the public disease/model reference data.
- The backend secret key bypasses RLS by design, so FastAPI independently
  applies owner filters to every user-owned query.
