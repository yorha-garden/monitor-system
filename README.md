# YoRHa Garden — monitor-system

Landing page for **yorhagarden.xyz**, the development and staging VPS for
[al.is-a.dev](https://al.is-a.dev): a single page with a NieR-style boot sequence, a section
browser and a light/dark display mode.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19 and TypeScript
- Plain CSS in [app/globals.css](app/globals.css), no CSS framework
- Fonts via `next/font`: self-hosted Acorn ([app/fonts/acorn.woff](app/fonts/acorn.woff)),
  plus Poppins and Noto Sans JP from Google Fonts, downloaded at build time and served
  from this app
- ESLint with `eslint-config-next`

```text
app/
  layout.tsx        root layout: fonts, metadata, pre-paint script, boot overlay
  page.tsx          landing page content
  globals.css       all styles
  icon.svg          favicon
  _components/      client components (boot, sections, clock, mode switch, glitch title)
```

## Setup & run

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

| Command         | What it does                         |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the dev server with hot reload |
| `npm run lint`  | Run ESLint                           |
| `npm run build` | Type-check and build for production  |
| `npm start`     | Serve the production build           |

## Environment variables

None. The page is fully static.

## Deployment

The page is prerendered at build time, so it can be served by `npm start` (`next start`) behind
the existing tunnel/reverse proxy for yorhagarden.xyz.
<!-- TODO: document the actual web server / tunnel setup. -->

## Contributing

Follow the repository SOP in [docs/github-repository-guideline.md](docs/github-repository-guideline.md).
Agent-facing instructions are in [AGENTS.md](AGENTS.md); decisions are recorded in [docs/adr/](docs/adr/).
