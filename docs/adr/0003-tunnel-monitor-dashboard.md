# 3. Monitor Cloudflare Tunnels through the Cloudflare API, behind Cloudflare Access

- Status: accepted; the consequence that locally configured tunnels don't appear is superseded
  by [ADR 0004](0004-find-local-tunnels-through-dns.md)
- Date: 2026-10-20

## Context

yorhagarden.xyz hostnames are served through Cloudflare Tunnels whose `cloudflared` connectors run
on more than one server. We want one place that shows whether each tunnel and connector is up,
whether each public hostname actually answers, and how much traffic and how many errors it sees.

## Decision

- **Data source: the Cloudflare API**, with one read-only token (Cloudflare Tunnel: Read,
  Analytics: Read). The API sees every connector of every tunnel wherever it runs, so no server
  needs to expose cloudflared's local `/metrics` endpoint. Tunnels are matched to the domain by
  their remotely managed ingress rules; traffic comes from the zone's `httpRequestsAdaptiveGroups`
  GraphQL dataset over the last 24 hours (the widest single-query window on most plans).
- **Uptime checks from this server**: each public hostname is requested through Cloudflare like a
  visitor would. Anything below 500 (including an Access login redirect) counts as up.
- **Same app, own hostname**: the dashboard is a separate root layout in this Next.js app, served
  only when the request's host is `DASHBOARD_HOST` (`proxy.ts` rewrites `/` there to `/dashboard`
  and returns 404 for `/dashboard` on every other host).
- **Cloudflare Access for authentication**, verified by the app as well: the proxy and the page
  both check the `Cf-Access-Jwt-Assertion` token (RS256, issuer and audience) against the team's
  published keys. Without Access configured the dashboard refuses every request (fails closed).
- **No caching**: every page load (and the 30-second auto-refresh) fetches fresh data. One load
  costs one tunnel list, two calls per tunnel and one GraphQL query, well inside API rate limits.

## Consequences

- Tunnels configured with a local `config.yml` don't appear, because the API can't see their
  routes.
- Traffic numbers are sampled by Cloudflare and approximate.
- The API token and Access settings live in the server's environment (`.env.local`), never in
  the repository. Without them, the landing page works and the dashboard shows what's missing.
- E2E tests run the dashboard against a mock Cloudflare API and Access key server
  (`tests/mock/cloudflare.mjs`), so CI needs no credentials. The real API is only exercised once
  the token is configured on the server.
