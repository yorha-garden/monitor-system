// Shapes the dashboard works with, and the pure functions that build them from Cloudflare API
// responses. Kept free of `server-only` so unit tests can import it directly.

export type TunnelStatus = "healthy" | "degraded" | "down" | "inactive";

export type Route = {
  hostname: string;
  service: string;
  path?: string;
};

// One running cloudflared process. A server can run several, and one tunnel can have connectors
// on several servers.
export type Connector = {
  id: string;
  version: string;
  arch: string;
  runAt: string | null;
  originIps: string[];
  edges: string[];
};

export type Tunnel = {
  id: string;
  name: string;
  status: TunnelStatus;
  activeAt: string | null;
  inactiveAt: string | null;
  connectors: Connector[];
  routes: Route[];
};

export type HostTraffic = {
  requests: number;
  clientErrors: number;
  serverErrors: number;
};

export type ProbeResult = {
  hostname: string;
  state: "up" | "down";
  status?: number;
  ms: number;
  error?: string;
};

// --- Cloudflare API response shapes (only the fields we read) ---

export type ApiTunnel = {
  id: string;
  name: string;
  status: TunnelStatus;
  config_src?: "local" | "cloudflare";
  conns_active_at?: string | null;
  conns_inactive_at?: string | null;
};

export type ApiConnectorClient = {
  id: string;
  arch?: string;
  version?: string;
  run_at?: string;
  conns?: { colo_name?: string; origin_ip?: string }[];
};

export type ApiIngressRule = {
  hostname?: string;
  service: string;
  path?: string;
};

// A DNS record as listed by GET /zones/{zone_id}/dns_records.
export type ApiDnsRecord = {
  name: string;
  type: string;
  content: string;
  proxied?: boolean;
};

export type ApiTrafficRow = {
  count: number;
  dimensions: { clientRequestHTTPHost: string; edgeResponseStatus: number };
};

// --- Builders ---

export function isDomainHostname(hostname: string, domain: string) {
  const host = hostname.toLowerCase();
  const zone = domain.toLowerCase();
  return host === zone || host.endsWith(`.${zone}`);
}

// Public hostname rules under the monitored domain. The catch-all rule has no hostname and is skipped.
export function toRoutes(ingress: ApiIngressRule[] | undefined, domain: string): Route[] {
  return (ingress ?? [])
    .filter((rule): rule is ApiIngressRule & { hostname: string } =>
      Boolean(rule.hostname && isDomainHostname(rule.hostname, domain)),
    )
    .map((rule) => ({
      hostname: rule.hostname.toLowerCase(),
      service: rule.service,
      ...(rule.path ? { path: rule.path } : {}),
    }));
}

// Shown in the service column for hostnames found through DNS: the service they reach is set in
// the tunnel's local config.yml, which the API can't see.
export const LOCAL_CONFIG_SERVICE = "local config";

// `<tunnel-id>.cfargotunnel.com` (or `.fed-cfargotunnel.com` on FedRAMP accounts) -> tunnel id.
export function tunnelIdFromTarget(content: string) {
  return content.toLowerCase().match(/^([^.]+)\.(?:fed-)?cfargotunnel\.com\.?$/)?.[1] ?? null;
}

// Hostnames under the domain that each tunnel serves, from the proxied CNAMEs pointing at it.
// This works whatever the tunnel's config source, so it also covers tunnels run from a local
// config.yml.
export function dnsHostnamesByTunnel(records: ApiDnsRecord[], domain: string): Map<string, string[]> {
  const byTunnel = new Map<string, Set<string>>();
  for (const record of records) {
    if (record.type !== "CNAME" || record.proxied !== true) continue;
    if (!isDomainHostname(record.name, domain)) continue;
    const id = tunnelIdFromTarget(record.content);
    if (!id) continue;
    if (!byTunnel.has(id)) byTunnel.set(id, new Set());
    byTunnel.get(id)!.add(record.name.toLowerCase());
  }
  return new Map([...byTunnel].map(([id, hosts]) => [id, [...hosts].sort()]));
}

// Routes of one tunnel. A remotely managed tunnel's ingress rules are authoritative and say which
// service each hostname reaches. For any other tunnel only DNS shows its hostnames.
export function tunnelRoutes(
  tunnel: ApiTunnel,
  ingress: ApiIngressRule[] | undefined,
  dnsHostnames: string[] | undefined,
  domain: string,
): Route[] {
  if (tunnel.config_src === "cloudflare") return toRoutes(ingress, domain);
  return (dnsHostnames ?? []).map((hostname) => ({ hostname, service: LOCAL_CONFIG_SERVICE }));
}

function unique(values: (string | undefined)[]) {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort();
}

export function toConnector(client: ApiConnectorClient): Connector {
  const conns = client.conns ?? [];
  return {
    id: client.id,
    version: client.version ?? "unknown",
    arch: client.arch ?? "unknown",
    runAt: client.run_at ?? null,
    originIps: unique(conns.map((c) => c.origin_ip)),
    edges: unique(conns.map((c) => c.colo_name)),
  };
}

export function toTunnel(tunnel: ApiTunnel, clients: ApiConnectorClient[], routes: Route[]): Tunnel {
  return {
    id: tunnel.id,
    name: tunnel.name,
    status: tunnel.status,
    activeAt: tunnel.conns_active_at ?? null,
    inactiveAt: tunnel.conns_inactive_at ?? null,
    connectors: clients.map(toConnector),
    routes,
  };
}

// Distinct hostnames to probe and report traffic for. Wildcard hostnames can't be probed.
export function routeHostnames(tunnels: Tunnel[]) {
  return unique(tunnels.flatMap((t) => t.routes.map((r) => r.hostname))).filter(
    (host) => !host.startsWith("*."),
  );
}

export function summarizeTraffic(rows: ApiTrafficRow[]): Record<string, HostTraffic> {
  const byHost: Record<string, HostTraffic> = {};
  for (const { count, dimensions } of rows) {
    const host = dimensions.clientRequestHTTPHost.toLowerCase();
    const totals = (byHost[host] ??= { requests: 0, clientErrors: 0, serverErrors: 0 });
    totals.requests += count;
    if (dimensions.edgeResponseStatus >= 500) totals.serverErrors += count;
    else if (dimensions.edgeResponseStatus >= 400) totals.clientErrors += count;
  }
  return byHost;
}

// Anything below 500 means the origin behind the tunnel answered, including redirects to a
// Cloudflare Access login and 4xx pages. 5xx covers tunnel errors such as 502 and 530.
export function classifyStatus(status: number): ProbeResult["state"] {
  return status < 500 ? "up" : "down";
}

export function probeUrl(template: string, hostname: string) {
  return template.replaceAll("{hostname}", hostname);
}

// "3d 4h", "5h 12m", "42m", "<1m"
export function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "<1m";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
