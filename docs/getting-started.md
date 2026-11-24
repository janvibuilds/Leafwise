# Getting started

This guide takes you from a fresh clone to your first leaf prediction running
locally. Budget about 30–45 minutes the first time (most of it is dependency
installation and Supabase setup).

**What you'll build up:**

```text
Terminal 1: FastAPI on http://127.0.0.1:8000
Terminal 2: Next.js on http://lvh.me:3000  (workspace: app.lvh.me:3000)
Supabase:   Auth + Postgres + private Storage (cloud-hosted, free tier)
```

---

## 1. Prerequisites

| Tool | Version | Check with |
| --- | --- | --- |
| Python | 3.12+ | `python --version` |
| Node.js | 20+ (24 LTS recommended) | `node --version` |
| npm | 10+ | `npm --version` |
| Git | latest | `git --version` |
| A Supabase account | free tier is fine | <https://supabase.com> |

You also need ability to edit the system hosts file (administrator rights on
Windows).

## 2. Clone the repository

```bash
git clone https://github.com/janvibuilds/Leafwise.git
cd Leafwise
```

## 3. Create a Supabase project

1. Sign in at <https://supabase.com> → **New project**.
2. Pick a name, database password, and region close to you.
3. Wait ~2 minutes for provisioning.

Then collect three values from **Project Settings → API**:

| Value | Where in dashboard | Used by |
| --- | --- | --- |
| Project URL | `Project URL` (`https://<ref>.supabase.co`) | backend + frontend |
| Publishable key | `Publishable key` (`sb_publishable_…`) | frontend only |
| Secret key | `Secret key` (`sb_secret_…`) — press "Reveal" | **backend only** |

You'll also need the **JWT Secret** (Settings → API → JWT Secret) for the
backend.

> ⚠️ The secret key and JWT secret are server-side secrets. They must never
> be committed, never go into a `NEXT_PUBLIC_` variable, and never appear in
> screenshots or chat.

## 4. Apply the database schema

The repository ships a reproducible schema package in [`supabase/`](../supabase/README.md):

1. Supabase Dashboard → **SQL Editor** → **New query**.
2. Paste all of `supabase/migrations/001_initial_schema.sql` → **Run**.
3. New query → paste all of `supabase/seed.sql` → **Run**.
4. New query → paste all of `supabase/tests/schema-check.sql` → **Run**.

Step 4 must return:

```text
Supabase schema check passed | 38 | 1
```

That creates five tables with RLS policies, a private `prediction-images`
storage bucket, and the 38 disease rows the classifier predicts over.

## 5. Configure environment variables

### Backend — `backend/.env`

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...          # the SECRET key, not publishable
SUPABASE_JWT_SECRET=<JWT Secret from dashboard>
```

Optional (defaults are fine locally): `MAX_UPLOAD_BYTES`, `MAX_IMAGE_PIXELS`,
`STORAGE_BUCKET`, `CORS_ORIGINS`.

### Frontend — `frontend/.env.local`

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://lvh.me:3000
NEXT_PUBLIC_APP_URL=http://app.lvh.me:3000
NEXT_PUBLIC_COOKIE_DOMAIN=lvh.me
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## 6. Point `lvh.me` at your machine

The app is split across two hostnames (marketing vs. workspace), so local dev
needs real subdomains that resolve to `127.0.0.1`.

Edit your hosts file:

- **Windows:** `C:\Windows\System32\drivers\etc\hosts`
- **macOS/Linux:** `/etc/hosts`

Add:

```text
127.0.0.1 lvh.me
127.0.0.1 app.lvh.me
```

Why not `app.localhost`? Next.js 16's dev server normalizes `app.localhost`
to `localhost`, which breaks cross-subdomain redirects. `lvh.me` is a public
DNS name that always resolves to `127.0.0.1` and supports real subdomain
cookies.

## 7. Install dependencies

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install pytest httpx ruff mypy  # dev tools used by the quality gates

# Terminal 2 — frontend
cd frontend
npm install
```

## 8. Run the stack

```bash
# Terminal 1 — API on port 8000
cd backend
python -m uvicorn app.main:app --env-file .env --port 8000
```

Startup takes ~10–15 seconds while TensorFlow loads. Verify:

```bash
curl http://127.0.0.1:8000/health/live     # {"status":"live"}
curl http://127.0.0.1:8000/health/ready    # ready state (503 if the model can't load)
curl http://127.0.0.1:8000/api/v1/diseases # public catalog, "count": 38
```

```bash
# Terminal 2 — web app on port 3000
cd frontend
npm run dev
```

### Supabase Auth URL configuration

One-time dashboard setup (**Authentication → URL Configuration**):

- Site URL: `http://lvh.me:3000`
- Redirect URLs: `http://lvh.me:3000/auth/callback` and `http://app.lvh.me:3000/**`

For Google sign-in, enable the Google provider and add the same callback URL
to its allowed redirects. To sign up without a confirmation email (recommended
for dev, avoids free-plan rate limits), see
[frontend/README.md](../frontend/README.md#sign-up-without-confirmation-email-avoids-email-rate-limits).

## 9. Create an account and scan a leaf

1. Open <http://lvh.me:3000> → **Sign up** (new account).
2. You land on <http://app.lvh.me:3000/dashboard>.
3. Open **New scan** → pick a leaf photo (JPEG/PNG/WEBP, ≤ 5 MB) → **Analyze**.
4. You'll see the top-3 predictions with confidence states; the scan appears
   in **History** with a short-lived signed image link.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `ERR_NAME_NOT_RESOLVED` for `lvh.me` | Hosts entry missing or DNS cache | Re-check hosts file; run `ipconfig /flushdns` (Windows) |
| Redirect loop between `lvh.me` and `app.lvh.me` | Stale auth cookies | Clear cookies for `lvh.me`, sign in again |
| `503` from the frontend | Dev server restarting/recompiling, or stale browser state | Wait for compile, hard-refresh (`Ctrl+Shift+R`), check the dev terminal for errors |
| `Connection refused` on port 8000 | API not running, or an old process holds the port | Start the API; `netstat -ano \| findstr :8000` and stop that PID |
| `503` from `/health/ready` | Model assets failed to load | Read the API terminal log; see `backend/README.md` |
| `401 UNAUTHENTICATED` from API calls | Missing/expired token or wrong JWT secret | Confirm `SUPABASE_JWT_SECRET` matches the dashboard; sign in again |
| `502 STORAGE_ERROR` on a prediction | Supabase URL/secret key wrong, or bucket missing | Re-check `backend/.env`; confirm the schema was applied |
| CORS error in browser | Backend `CORS_ORIGINS` missing your origin | Add `http://lvh.me:3000` and `http://app.lvh.me:3000` |
| `over_email_send_rate_limit` on signup | Supabase free-plan email limit | Turn **Confirm email** OFF (see frontend README) |
| Prediction results look wrong | Model artifact mismatch | `GET /health/ready` reports asset problems; see `backend/README.md` |

## Next steps

- Understand the system → [architecture.md](architecture.md)
- Find where to make a change → [codebase-guide.md](codebase-guide.md)
- Run the quality gates before your first PR → [CONTRIBUTING.md](../CONTRIBUTING.md)
