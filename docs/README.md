# Leafwise documentation

This folder holds the project's guides — the material that helps you
**understand the codebase**, not just run it. Start at the top and go down as
far as you need.

## Documentation map

| # | Document | Audience | Read it when… |
| --- | --- | --- | --- |
| 1 | [getting-started.md](getting-started.md) | First-time contributors | You want to get the whole stack running locally and make your first prediction |
| 2 | [architecture.md](architecture.md) | Contributors, reviewers | You need to understand *why* the system is shaped this way — components, request lifecycles, security model, key decisions |
| 3 | [codebase-guide.md](codebase-guide.md) | Contributors | You know *what* you want to change and need to find *where* — a file-by-file map of backend, frontend, and database |
| 4 | [superpowers/](superpowers/) | Historians | You want the original design spec and implementation plan that built the project |

Also here: [`research/`](research/) — the original training notebook, kept as a
research-only artifact (never executed by the app).

Related documentation outside this folder:

| Document | What it covers |
| --- | --- |
| [../README.md](../README.md) | Project overview, features, quickstart, status |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution workflow, quality gates, PR expectations |
| [../backend/README.md](../backend/README.md) | API endpoints, error codes, auth verification, backend commands |
| [../frontend/README.md](../frontend/README.md) | Frontend setup, route groups, Supabase/Vercel configuration |
| [../supabase/README.md](../supabase/README.md) | Database schema, how to apply it, security model |
| [../backend/models/MODEL_CARD.md](../backend/models/MODEL_CARD.md) | Dataset, metrics, limitations, intended use |

## How we write documentation

### Where does a new piece of knowledge go?

Ask "who needs this, and when?":

1. **"How do I run / install / configure this?"** → the relevant README
   (root for overview-level, `backend/`, `frontend/`, or `supabase/` for
   component-level) or [getting-started.md](getting-started.md) if it's part
   of the first-run walkthrough.
2. **"How does the system work / why was it built this way?"** →
   [architecture.md](architecture.md).
3. **"Where is the code for X / how do I change X?"** →
   [codebase-guide.md](codebase-guide.md).
4. **"What does this endpoint/parameter/error mean?"** →
   [backend/README.md](../backend/README.md) (API reference lives with the API).
5. **"What are the rules for contributing?"** → `CONTRIBUTING.md`,
   `CODE_OF_CONDUCT.md`, `SECURITY.md` at the repository root.
6. **Inline, close to the code** — docstrings, `//` comments, and JSDoc for
   *why a specific line exists*. Docs explain the system; comments explain the
   line.

### Rules of thumb

- **Docs travel with behavior.** If your PR changes how something works, the
  PR must update the doc that describes it. Reviewers check this.
- **One source of truth.** Never copy a table of endpoints or env vars into
  two places — link to the canonical one.
- **Write for a new contributor.** Define acronyms on first use, link
  commands to where they run from (root vs. subfolder), and prefer a short
  example over a long paragraph.
- **Stay honest.** Mark provisional values (e.g. confidence thresholds) and
  unverified claims explicitly instead of deleting them.
- **Screenshots are optional, commands are mandatory.** UI changes should
  include a screenshot in the PR description; docs should always include
  copy-pasteable commands.

### Review checklist for doc changes

- [ ] Links resolve (relative paths from the file's own location)
- [ ] Commands run from the directory stated in the text
- [ ] No secrets, real keys, or personal data pasted in
- [ ] The canonical README for the affected area was updated, not just this folder
- [ ] Status tables still reflect reality
