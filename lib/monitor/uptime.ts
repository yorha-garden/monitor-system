import "server-only";
import { classifyStatus, probeUrl, type ProbeResult } from "./model";

const TIMEOUT_MS = 5_000;

// Requests the public hostname from this server, through Cloudflare and the tunnel, the same way a
// visitor would. Redirects are not followed, so an Access login redirect still counts as up.
export async function probeHostname(hostname: string, urlTemplate: string): Promise<ProbeResult> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  try {
    const res = await fetch(probeUrl(urlTemplate, hostname), {
      redirect: "manual",
      cache: "no-store",
      headers: { "User-Agent": "yorha-garden-monitor/1" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.body?.cancel();
    return { hostname, state: classifyStatus(res.status), status: res.status, ms: elapsed() };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { hostname, state: "down", ms: elapsed(), error: timedOut ? "Timed out" : "Unreachable" };
  }
}

export function probeHostnames(hostnames: string[], urlTemplate: string) {
  return Promise.all(hostnames.map((hostname) => probeHostname(hostname, urlTemplate)));
}
