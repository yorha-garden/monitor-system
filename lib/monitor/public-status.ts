// What the public landing page may show about the garden: counts and edge cities only, never
// IPs, ports or hostnames. Pure, so unit tests can import it directly.
import type { ProbeResult, Tunnel } from "./model";

export type PublicStatus =
  | {
      state: "ok";
      vitals: "green" | "degraded" | "offline";
      tunnelsOnline: number;
      tunnelsTotal: number;
      hostnamesUp: number;
      hostnamesTotal: number;
      edges: string[];
      checkedAt: string;
    }
  | { state: "unavailable" };

// The parts of a monitor report the summary reads.
export type ReportLike = {
  generatedAt: Date;
  tunnels: Tunnel[];
  probes: Record<string, ProbeResult>;
  errors: string[];
};

const EDGE_CITIES: Record<string, string> = {
  ams: "Amsterdam",
  bom: "Mumbai",
  cgk: "Jakarta",
  fra: "Frankfurt",
  hkg: "Hong Kong",
  icn: "Seoul",
  kul: "Kuala Lumpur",
  lax: "Los Angeles",
  lhr: "London",
  nrt: "Tokyo",
  sin: "Singapore",
  syd: "Sydney",
};

// Cloudflare edge locations are named after the nearest airport: "cgk01" -> "Jakarta".
export function edgeCity(colo: string) {
  const code = colo.toLowerCase().match(/^[a-z]+/)?.[0] ?? colo.toLowerCase();
  return EDGE_CITIES[code] ?? code.toUpperCase();
}

export function toPublicStatus(report: ReportLike): PublicStatus {
  const { tunnels, probes, errors } = report;
  if (tunnels.length === 0 && errors.length > 0) return { state: "unavailable" };

  // A degraded tunnel still has connectors serving traffic.
  const tunnelsOnline = tunnels.filter((t) => t.status === "healthy" || t.status === "degraded").length;
  const checks = Object.values(probes);
  const hostnamesUp = checks.filter((p) => p.state === "up").length;
  const edges = [...new Set(tunnels.flatMap((t) => t.connectors.flatMap((c) => c.edges)).map(edgeCity))].sort();

  const allGood =
    tunnels.every((t) => t.status === "healthy") && hostnamesUp === checks.length && errors.length === 0;
  const vitals = allGood ? "green" : tunnelsOnline === 0 ? "offline" : "degraded";

  return {
    state: "ok",
    vitals,
    tunnelsOnline,
    tunnelsTotal: tunnels.length,
    hostnamesUp,
    hostnamesTotal: checks.length,
    edges,
    checkedAt: report.generatedAt.toISOString(),
  };
}
