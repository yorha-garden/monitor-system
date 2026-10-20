import "server-only";
import type { MonitorConfig } from "./config";
import {
  dnsHostnamesByTunnel,
  summarizeTraffic,
  toTunnel,
  tunnelRoutes,
  type ApiConnectorClient,
  type ApiDnsRecord,
  type ApiIngressRule,
  type ApiTrafficRow,
  type ApiTunnel,
  type HostTraffic,
  type Tunnel,
} from "./model";

const TIMEOUT_MS = 10_000;

type Envelope<T> = {
  success: boolean;
  errors?: { code: number; message: string }[];
  result: T;
  result_info?: { page?: number; total_pages?: number };
};

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    // HTTP status of the failed request, when there was a response.
    readonly status?: number,
  ) {
    super(message);
  }
}

function authHeaders(config: MonitorConfig) {
  return { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" };
}

async function request<T>(config: MonitorConfig, path: string): Promise<Envelope<T>> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: authHeaders(config),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body?.success) {
    const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join("; ");
    throw new CloudflareApiError(
      `GET ${path.split("?")[0]} failed: ${detail || `HTTP ${res.status}`}`,
      res.status,
    );
  }
  return body;
}

async function api<T>(config: MonitorConfig, path: string): Promise<T> {
  return (await request<T>(config, path)).result;
}

// Every page of a paginated list endpoint. `path` must already have a query string.
async function apiList<T>(config: MonitorConfig, path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const body = await request<T[]>(config, `${path}&page=${page}`);
    items.push(...body.result);
    if (page >= (body.result_info?.total_pages ?? 1) || body.result.length === 0) return items;
  }
}

// The zone's CNAME records. Tunnel public hostnames are proxied CNAMEs to
// `<tunnel-id>.cfargotunnel.com`, which is how tunnels with a local config.yml are found.
// Needs the token's Zone > DNS > Read permission.
export async function getZoneCnameRecords(config: MonitorConfig): Promise<ApiDnsRecord[]> {
  const zone = `/zones/${encodeURIComponent(config.zoneId)}`;
  return apiList<ApiDnsRecord>(config, `${zone}/dns_records?type=CNAME&per_page=1000`);
}

// Tunnels in the account that route at least one hostname under the monitored domain, with their
// connectors (one per running cloudflared, wherever it runs) and routes.
//
// Remotely managed tunnels report their routes through their ingress rules. Tunnels run from a
// local config.yml are matched through the zone's DNS records instead, passed in as `dnsRecords`.
// When those are unavailable (null), only remotely managed tunnels appear.
export async function getDomainTunnels(
  config: MonitorConfig,
  dnsRecords: Promise<ApiDnsRecord[] | null>,
): Promise<Tunnel[]> {
  const account = `/accounts/${encodeURIComponent(config.accountId)}`;
  const [tunnels, records] = await Promise.all([
    api<ApiTunnel[]>(config, `${account}/cfd_tunnel?is_deleted=false&per_page=1000`),
    dnsRecords,
  ]);
  const dnsHostnames = dnsHostnamesByTunnel(records ?? [], config.domain);

  const detailed = await Promise.all(
    tunnels
      .filter((t) => t.config_src === "cloudflare" || dnsHostnames.has(t.id.toLowerCase()))
      .map(async (tunnel) => {
        const base = `${account}/cfd_tunnel/${encodeURIComponent(tunnel.id)}`;
        // Locally configured tunnels have no remote configuration to fetch.
        const [configuration, clients] = await Promise.all([
          tunnel.config_src === "cloudflare"
            ? api<{ config?: { ingress?: ApiIngressRule[] } }>(config, `${base}/configurations`)
            : null,
          api<ApiConnectorClient[]>(config, `${base}/connections`),
        ]);
        const routes = tunnelRoutes(
          tunnel,
          configuration?.config?.ingress,
          dnsHostnames.get(tunnel.id.toLowerCase()),
          config.domain,
        );
        return routes.length > 0 ? toTunnel(tunnel, clients, routes) : null;
      }),
  );

  return detailed
    .filter((t): t is Tunnel => t !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const TRAFFIC_QUERY = `
  query TunnelHostTraffic($zoneTag: string!, $since: Time!, $until: Time!, $hosts: [string!]) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequestsAdaptiveGroups(
          limit: 5000
          filter: {
            datetime_geq: $since
            datetime_lt: $until
            requestSource: "eyeball"
            clientRequestHTTPHost_in: $hosts
          }
          orderBy: [count_DESC]
        ) {
          count
          dimensions { clientRequestHTTPHost edgeResponseStatus }
        }
      }
    }
  }
`;

// Requests per hostname over the last 24 hours from Cloudflare's (sampled) HTTP analytics.
// 24 hours is the widest window the adaptive dataset allows per query on most plans.
export async function getHostTraffic(
  config: MonitorConfig,
  hostnames: string[],
  now = new Date(),
): Promise<Record<string, HostTraffic>> {
  if (hostnames.length === 0) return {};
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const res = await fetch(`${config.apiBaseUrl}/graphql`, {
    method: "POST",
    headers: authHeaders(config),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      query: TRAFFIC_QUERY,
      variables: {
        zoneTag: config.zoneId,
        since: since.toISOString(),
        until: now.toISOString(),
        hosts: hostnames,
      },
    }),
  });
  // GraphQL reports most failures as HTTP 200 with an `errors` array.
  const body = (await res.json().catch(() => null)) as {
    data?: { viewer?: { zones?: { httpRequestsAdaptiveGroups?: ApiTrafficRow[] }[] } };
    errors?: { message: string }[] | null;
  } | null;
  if (!res.ok || !body || (body.errors && body.errors.length > 0)) {
    const detail = body?.errors?.map((e) => e.message).join("; ");
    throw new CloudflareApiError(`Traffic analytics query failed: ${detail || `HTTP ${res.status}`}`);
  }
  return summarizeTraffic(body.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? []);
}
