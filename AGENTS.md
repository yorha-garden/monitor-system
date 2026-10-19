# Agent instructions

Every agent (Claude, Codex, Cursor, …) working in this repository must follow the team's
GitHub repository SOP: [docs/github-repository-guideline.md](docs/github-repository-guideline.md).
The rules below are that SOP restated as instructions. If they ever disagree, the SOP wins.
Where the SOP is stricter than an agent's default habits or a personal/global convention
(for example branch prefixes), follow the SOP inside this repository.

## 1. Commits: small and focused

- One commit = one logical change that can be described in one sentence.
- Aim for roughly 5–100 changed lines per commit. Never produce 1000+ line, many-concern commits.
- Commit at every natural checkpoint: a function finished, a bug fixed, a logical step done.
  Don't pile up many changes without intermediate commits.
- Never mix concerns in one commit: no refactor + feature, no fix + formatting.
  Split them into separate commits (stage selectively with `git add -p` / by path).
- No "WIP" commits on shared branches, and clean up before committing (no debug prints,
  commented-out experiments or stray files).

## 2. Commit messages: Conventional Commits

Format: `type(scope): description`, scope optional, description lowercase imperative.

| Type       | Use for                  |
| ---------- | ------------------------ |
| `feat`     | new feature              |
| `fix`      | bug fix                  |
| `refactor` | code restructuring       |
| `docs`     | documentation            |
| `chore`    | maintenance              |
| `test`     | tests                    |

Breaking changes get a `!`: `feat(api)!: change response format`.

Good: `feat(auth): add JWT refresh token`, `fix: handle null response on login API`,
`refactor: simplify auth middleware`.
Bad: `update code`, `fix bugs`, `final fix beneran`.

### Before every commit

- All tests pass.
- New features come with new tests.
- No lint errors.
- The change has been validated locally (run it, open it, exercise it).

If the project has no test or lint tooling for what you changed, say so explicitly in your
report instead of claiming it was tested.

## 3. Branching: trunk-based

- `main` is always production-ready and releasable at any time.
- `release` tracks the current production version.
- There are **no** `develop`, `staging` or similar long-lived branches. Don't create them.
- **Never commit directly to `main`.** The only exception is an emergency/incident hotfix,
  and only when the user explicitly says it is one.
- All work goes through a short-lived branch and a Pull Request.
- Branch names describe the change:
  - `feature/<short-description>`, e.g. `feature/payment-integration`
  - `fix/<bug-description>`, e.g. `fix/login-validation-error`
  - `chore/<maintenance>`, e.g. `chore/update-dependencies`
- Name the branch correctly before opening a PR (renaming a PR's head branch closes the PR).

## 4. Documentation

- `README.md` must always cover: project overview, tech stack, setup & run, environment
  variables, and (optionally) deployment. Update it in the same PR as any change that makes
  it stale.
- Additional docs live in `docs/`: architecture diagram, API spec, and decision log (ADRs in
  `docs/adr/`). Record significant technical decisions as an ADR.

## 5. Security

Never commit:

- `.env` files or any other file holding real configuration secrets
- API keys, tokens, passwords, private keys or certificates
- Log files

Check `git diff --staged` before committing. Document required variables in `README.md`
(and an `.env.example` with placeholder values) instead. If a secret is ever committed,
stop and tell the user: it must be rotated, not just deleted in a follow-up commit.
