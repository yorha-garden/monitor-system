# 2. Test with Playwright end-to-end tests and run checks in GitHub Actions

- Status: accepted
- Date: 2026-10-20

## Context

After the Next.js migration ([ADR 0001](0001-migrate-to-nextjs-app-router.md)) the only checks
were `npm run lint` and `npm run build`, run by hand, while the SOP requires tests with every
feature. Almost all of the page's logic is browser behaviour: the pre-paint inline script, the
boot overlay and its session state, keyboard navigation, the persisted display mode and
hydration itself. Unit tests of the components would miss most of that.

## Decision

- Test the page end to end with Playwright (`@playwright/test`), Chromium only, in `tests/`.
- Run the suite against the production build (`npm run build && npm start` via Playwright's
  `webServer`, on port 3100 by default), since that is what gets deployed and it is where the
  inline script and hydration behave as they do for visitors.
- Assert on what a visitor sees (visibility, roles, `aria-selected`, storage) rather than on
  component internals, so refactors such as dropping the overlay element for returning visitors
  don't break the tests.
- Every test fails on console errors, uncaught page errors or hydration warnings.
- Add a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs `npm ci`, lint, build,
  installs Chromium and runs `npm test` on every pull request and push to `main`.

## Consequences

- `npm test` is now a required check for every change, locally and in CI.
- A local run builds the app first, so it takes about a minute; CI reuses the build from its
  build step.
- Contributors need a Playwright Chromium build once (`npx playwright install chromium`).
- Other browsers and visual regressions are not covered yet.
