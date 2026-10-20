# 4. Find locally configured tunnels through the zone's DNS records

- Status: accepted
- Date: 2026-10-20
- Supersedes: the "local config tunnels don't appear" consequence of
  [ADR 0003](0003-tunnel-monitor-dashboard.md)

## Context

ADR 0003 matches tunnels to the monitored domain by their ingress rules, which the API only
returns for remotely managed tunnels (`config_src: "cloudflare"`). Tunnels run from a local
cloudflared `config.yml` were left out. One of our servers runs such a tunnel, so the dashboard
missed a whole server even though the API reports that tunnel and its connectors.

## Decision

- **Read hostnames from DNS.** A tunnel's public hostnames are proxied CNAME records pointing at
  `<tunnel-id>.cfargotunnel.com`, whatever the tunnel's config source. The dashboard lists the
  zone's CNAME records (`GET /zones/{zone_id}/dns_records?type=CNAME`, every page) and maps each
  tunnel ID to the hostnames under the domain that point at it.
- **Ingress rules stay authoritative for remotely managed tunnels.** Their routes, services and
  paths are unchanged; DNS only adds tunnels that aren't remotely managed. Those routes show
  `local config` in the service column, because the service lives in the server's `config.yml`.
- **The token needs Zone > DNS > Read.** If listing DNS records fails, the dashboard falls back
  to remotely managed tunnels only and shows a notice instead of an error: for a 403 it names the
  missing permission. Tunnel status, uptime and traffic keep working.
- The DNS listing (one request per 1,000 CNAME records) runs in parallel with the tunnel list,
  and locally configured tunnels skip the configuration request.

## Consequences

- Locally configured tunnels appear with their connectors, uptime checks and traffic.
- Their service column is not known. A hostname they serve without a proxied CNAME in this zone
  (for example a DNS record managed elsewhere, or a load balancer in front of the tunnel) still
  doesn't appear.
- Existing tokens without the DNS permission keep working, with the notice, until the
  permission is added.
- The mock Cloudflare API serves DNS records with pagination, and the e2e suite runs a second
  server whose token lacks the DNS permission to cover the fallback.
