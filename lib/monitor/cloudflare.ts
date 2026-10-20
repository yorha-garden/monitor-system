import "server-only";
import type { MonitorConfig } from "./config";
import {
  summarizeTraffic,
  toRoutes,
  toTunnel,
  type ApiConnectorClient,
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
};

export class CloudflareApiError extends Error {}

function authHeaders(config: MonitorConfig) {
  return { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" };
}

async function api<T>(config: MonitorConfig, path: string): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: authHeaders(config),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body?.success) {
    const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join("; ");
    throw new CloudflareApiError(`GET ${path.split("?")[0]} failed: ${detail || `HTTP ${res.status}`}`);
  }
  return body.result;
}

// Tunnels in the account that route at least one hostname under the monitored domain, with their
// connectors (one per running cloudflared, wherever it runs) and routes.
//
// Only remotely managed tunnels expose their routes through the API. A tunnel configured with a
// local config.yml has no routes here and is left out.
export async function getDomainTunnels(config: MonitorConfig): Promise<Tunnel[]> {
  const account = `/accounts/${encodeURIComponent(config.accountId)}`;
  const tunnels = await api<ApiTunnel[]>(config, `${account}/cfd_tunnel?is_deleted=false&per_page=1000`);

  const detailed = await Promise.all(
    tunnels
      .filter((t) => t.config_src === "cloudflare")
      .map(async (tunnel) => {
        const base = `${account}/cfd_tunnel/${encodeURIComponent(tunnel.id)}`;
        const [configuration, clients] = await Promise.all([
          api<{ config?: { ingress?: ApiIngressRule[] } }>(config, `${base}/configurations`),
          api<ApiConnectorClient[]>(config, `${base}/connections`),
        ]);
        const routes = toRoutes(configuration.config?.ingress, config.domain);
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
