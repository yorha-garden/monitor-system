# 1. Migrate the landing page to Next.js (App Router)

- Status: accepted
- Date: 2026-10-20

## Context

The landing page was a single hand-written `public/index.html` (markup, CSS and script in one
file). The project is going to grow beyond one static page, and we want components,
TypeScript, linting and a standard build.

## Decision

Rebuild the page on Next.js 16 with the App Router and TypeScript, porting it as-is:

- Styles move verbatim to `app/globals.css`; only the font-family variables change to use
  `next/font` (Acorn via `next/font/local`, Poppins and Noto Sans JP via `next/font/google`,
  all self-hosted at build time).
- The page stays a Server Component. Interactive pieces (boot overlay, section tabs, clock,
  display-mode switch, title glitch) are small Client Components in `app/_components/`.
- A tiny inline script in the root layout's `<head>` runs before first paint to restore the
  saved display mode and decide whether the boot sequence plays, so returning visitors get
  neither a boot-overlay nor a light-mode flash before hydration.
- Plain CSS, no CSS framework, to keep the port a straight translation.

## Consequences

- The page renders pixel-identically to the static version (verified with headless Chromium
  screenshots at desktop and mobile widths, light and dark mode).
- The boot sequence starts once React hydrates instead of when the inline script ran, which
  delays the first log line by a fraction of a second; the overlay is shown immediately.
- The site now needs a Node.js runtime (`next start`) or a static export to be served.
- There is no automated test suite yet; checks are `npm run lint` and `npm run build`.
