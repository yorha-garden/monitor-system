import "server-only";
import { CloudflareApiError, getDomainTunnels, getHostTraffic, getZoneCnameRecords } from "./cloudflare";
import type { MonitorConfig } from "./config";
import { routeHostnames, type HostTraffic, type ProbeResult, type Tunnel } from "./model";
import { probeHostnames } from "./uptime";

export type Report = {
  generatedAt: Date;
  domain: string;
  tunnels: Tunnel[];
  // null when the analytics query failed, so the page can tell "no traffic" from "unknown".
  traffic: Record<string, HostTraffic> | null;
  probes: Record<string, ProbeResult>;
  errors: string[];
  // Partial data the page should point out, such as hidden locally configured tunnels.
  notices: string[];
};

// Never surfaces raw errors: they could carry request details, and the token must not leak.
function describe(err: unknown, fallback: string) {
  if (err instanceof CloudflareApiError) return err.message;
  if (err instanceof Error && err.name === "TimeoutError") return `${fallback} (timed out)`;
  return fallback;
}

// Without DNS records the dashboard still shows remotely managed tunnels, so this is a notice and
// not an error. A 403 means the token lacks the permission.
function dnsNotice(err: unknown) {
  const hidden = "Tunnels with a local config.yml are hidden";
  if (err instanceof CloudflareApiError && err.status === 403) {
    return `${hidden}: the API token needs the Zone > DNS > Read permission to list the zone's tunnel hostnames.`;
  }
  return `${hidden}: ${describe(err, "could not list the zone's DNS records")}`;
}

// Everything the dashboard shows, fetched fresh. Each part fails on its own, so a missing
// analytics permission still leaves tunnel status and uptime visible.
export async function loadReport(config: MonitorConfig): Promise<Report> {
  const generatedAt = new Date();
  const errors: string[] = [];
  const notices: string[] = [];

  const dnsRecords = getZoneCnameRecords(config).catch((err: unknown) => {
    notices.push(dnsNotice(err));
    return null;
  });

  let tunnels: Tunnel[] = [];
  try {
    tunnels = await getDomainTunnels(config, dnsRecords);
  } catch (err) {
    errors.push(describe(err, "Could not load tunnels from the Cloudflare API"));
  }
  // Settle the DNS lookup even when the tunnel list failed, so its notice is recorded.
  await dnsRecords;

  const hostnames = routeHostnames(tunnels);
  const [traffic, probes] = await Promise.allSettled([
    getHostTraffic(config, hostnames, generatedAt),
    probeHostnames(hostnames, config.probeUrlTemplate),
  ]);
  if (traffic.status === "rejected") {
    errors.push(describe(traffic.reason, "Could not load traffic analytics"));
  }

  return {
    generatedAt,
    domain: config.domain,
    tunnels,
    traffic: traffic.status === "fulfilled" ? traffic.value : null,
    probes:
      probes.status === "fulfilled"
        ? Object.fromEntries(probes.value.map((p) => [p.hostname, p]))
        : {},
    errors,
    notices,
  };
}
