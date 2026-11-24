# Security Policy

## Supported Versions

Security fixes are applied to the latest code on the `main` branch of
[janvibuilds/Leafwise](https://github.com/janvibuilds/Leafwise). If you are
running an older fork or commit, please update before reporting an issue that
may already be fixed.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, report them privately using GitHub Security Advisories:

1. Go to **Security → Report a vulnerability** on the repository:
   <https://github.com/janvibuilds/Leafwise/security/advisories/new>
2. Describe the issue, affected area (backend API, frontend, authentication
   flow, Supabase configuration), steps to reproduce, and potential impact.
3. If possible, include a proof of concept or suggested fix.

We will acknowledge the report within **5 days**, keep you updated on our
progress, and credit you in the fix announcement if you wish.

## Scope

In scope:

- The FastAPI backend (`backend/`) — authentication, inference API, storage
  access, input validation
- The Next.js frontend (`frontend/`) — auth flows, session handling, proxy/subdomain routing
- Supabase schema and policies (`supabase/`) — RLS policies, storage bucket rules

Out of scope:

- Denial-of-service against the hosted demo environment
- Issues requiring physical access to a user's device
- Vulnerabilities in third-party dependencies with no impact on this project
  (report those upstream)

## Preferred Disclosure

We prefer coordinated disclosure: give us a reasonable window to prepare and
ship a fix before publishing details.
