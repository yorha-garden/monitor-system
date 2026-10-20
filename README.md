# YoRHa Garden — monitor-system

Landing page for **yorhagarden.xyz**, the development and staging VPS for
[al.is-a.dev](https://al.is-a.dev): a single page with a NieR-style boot sequence, a section
browser and a light/dark display mode.

It also serves a private **monitor dashboard** on its own hostname (e.g.
`monitor.yorhagarden.xyz`, behind Cloudflare Access). It shows every Cloudflare Tunnel that routes
a yorhagarden.xyz hostname, across all servers running `cloudflared`, whether the tunnel is
managed in the Cloudflare dashboard or run from a local `config.yml`:

- tunnel health and each connector: the server's IP, Cloudflare edge locations, cloudflared
  version and uptime
- a live uptime check per public hostname (HTTP status and latency, checked from this server)
- requests, 4xx and 5xx per hostname over the last 24 hours (Cloudflare analytics, sampled)

The dashboard refreshes every 30 seconds.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19 and TypeScript
- Plain CSS in [app/globals.css](app/globals.css), no CSS framework
- Fonts via `next/font`: self-hosted Acorn ([app/fonts/acorn.woff](app/fonts/acorn.woff)),
  plus Poppins and Noto Sans JP from Google Fonts, downloaded at build time and served
  from this app
- ESLint with `eslint-config-next`
- [Playwright](https://playwright.dev) end-to-end tests (Chromium), run in GitHub Actions CI
- Dashboard: Cloudflare REST and GraphQL Analytics APIs, Access token checks with
  [`jose`](https://github.com/panva/jose)

```text
app/
  (site)/           landing page: root layout (pre-paint script, boot overlay) and page
  (monitor)/        dashboard: its own root layout, styles and /dashboard route
  _components/      shared client components (boot, sections, clock, mode switch, glitch title)
  fonts/            Acorn font file and the shared next/font setup
  globals.css       shared styles
  icon.svg          favicon
lib/monitor/        dashboard server code: Cloudflare API client, uptime checks, Access checks
proxy.ts            serves the dashboard only on DASHBOARD_HOST, behind a valid Access token
tests/              Playwright e2e and unit tests; tests/mock/ fakes the Cloudflare API
.github/workflows/  CI: lint, build and tests on pull requests and pushes to main
```

## Setup & run

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

| Command         | What it does                                           |
| --------------- | ------------------------------------------------------ |
| `npm run dev`   | Start the dev server with hot reload                   |
| `npm run lint`  | Run ESLint                                             |
| `npm run build` | Type-check and build for production                    |
| `npm start`     | Serve the production build                             |
| `npm test`      | Build, serve on port 3100 and run the Playwright tests |

Before the first `npm test`, install the browser once with `npx playwright install chromium`.
Set `PLAYWRIGHT_PORT` to serve the tests on another port. The tests run the dashboard against a
mock Cloudflare API (`tests/mock/cloudflare.mjs`, port 3199), so they need no real credentials.

To work on the dashboard locally, copy `.env.example` to `.env.local`, set `DASHBOARD_HOST=localhost`
and `DASHBOARD_DEV_SKIP_ACCESS=1`, fill in the Cloudflare values, run `npm run dev` and open
<http://localhost:3000>. The landing page is then at <http://127.0.0.1:3000>.

## Environment variables

The landing page needs none. The dashboard is configured entirely through the environment (see
[.env.example](.env.example)) and stays disabled until `DASHBOARD_HOST` is set. Values are read at
request time, so a restart is enough after changing them. Keep them in `.env.local` (git-ignored)
or the service's environment, never in the repository.

| Variable                     | Required | Purpose                                                            |
| ---------------------------- | -------- | ------------------------------------------------------------------ |
| `DASHBOARD_HOST`             | yes      | Hostname the dashboard is served on, e.g. `monitor.yorhagarden.xyz` |
| `CF_ACCESS_TEAM_DOMAIN`      | yes      | Zero Trust team domain, e.g. `your-team.cloudflareaccess.com`      |
| `CF_ACCESS_AUD`              | yes      | Application Audience (AUD) tag of the Access application           |
| `CLOUDFLARE_API_TOKEN`       | yes      | Read-only API token (permissions below)                            |
| `CLOUDFLARE_ACCOUNT_ID`      | yes      | Account that owns the tunnels                                      |
| `CLOUDFLARE_ZONE_ID`         | yes      | Zone ID of yorhagarden.xyz, for traffic analytics                  |
| `MONITOR_DOMAIN`             | yes      | Domain whose tunnels are shown, e.g. `yorhagarden.xyz`             |
| `MONITOR_PROBE_URL_TEMPLATE` | no       | Uptime check URL, default `https://{hostname}/`                    |
| `CLOUDFLARE_API_BASE_URL`    | no       | API base URL, default `https://api.cloudflare.com/client/v4`       |
| `DASHBOARD_DEV_SKIP_ACCESS`  | no       | `1` skips the Access check, only under `npm run dev`               |

### Setting up the dashboard on Cloudflare

1. **API token** (My Profile → API Tokens → Create custom token), read-only:
   - Account → **Cloudflare Tunnel** → Read
   - Zone → **Analytics** → Read, for the yorhagarden.xyz zone
   - Zone → **DNS** → Read, for the yorhagarden.xyz zone

   The account ID and zone ID are on the zone's Overview page.
2. **Access application** (Zero Trust → Access → Applications → Add → Self-hosted): domain
   `monitor.yorhagarden.xyz`, with a policy that allows only your identity (e.g. your email via
   one-time PIN or GitHub). Copy the application's **AUD tag** into `CF_ACCESS_AUD`, and your team
   domain (Zero Trust → Settings) into `CF_ACCESS_TEAM_DOMAIN`.
3. **Public hostname** on the yorhagarden.xyz tunnel (Networks → Tunnels → the tunnel → Public
   hostnames): `monitor.yorhagarden.xyz` → `http://localhost:8080`, the same service as the site.
   Do this after step 2. Even without Access in front, the app refuses every dashboard request
   that lacks a valid Access token.
4. Put the variables in `.env.local` next to the app and restart it.

Remotely managed tunnels (configured in the Cloudflare dashboard) are matched to the domain by
their ingress rules, which also give each route's service. A tunnel run from a local `config.yml`
has no rules the API can report, so its hostnames come from the zone's DNS instead: every proxied
CNAME to `<tunnel-id>.cfargotunnel.com`. Its routes show `local config` as the service, and a
hostname the tunnel serves without such a CNAME in this zone doesn't appear. Without the DNS permission, the dashboard shows only remotely
managed tunnels and a notice naming the missing permission.

## Deployment

The app runs with `npm start` (`next start`) on `127.0.0.1:8080` under the user systemd service
`yorhagarden.service`, and a Cloudflare Tunnel exposes it as yorhagarden.xyz and
monitor.yorhagarden.xyz. After pulling changes, rebuild and restart:

```bash
npm ci && npm run build && systemctl --user restart yorhagarden
```

The landing page is prerendered at build time; the dashboard renders on every request.

## Contributing

Follow the repository SOP in [docs/github-repository-guideline.md](docs/github-repository-guideline.md).
Agent-facing instructions are in [AGENTS.md](AGENTS.md); decisions are recorded in [docs/adr/](docs/adr/).
