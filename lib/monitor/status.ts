import "server-only";
import { readMonitorConfig } from "./config";
import { toPublicStatus, type PublicStatus } from "./public-status";
import { loadReport } from "./report";

// The landing page is public, so its status is computed at most once a minute however many people
// visit: each computation calls the Cloudflare API and probes every hostname.
const FRESH_MS = 60_000;

let cached: { at: number; value: PublicStatus } | undefined;
let pending: Promise<PublicStatus> | undefined;

async function compute(): Promise<PublicStatus> {
  const monitor = readMonitorConfig();
  if (!monitor.ok) return { state: "unavailable" };
  try {
    return toPublicStatus(await loadReport(monitor.config));
  } catch {
    return { state: "unavailable" };
  }
}

function refresh() {
  pending ??= compute()
    .then((value) => {
      cached = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}

// Stale-while-revalidate: once there is a value, visitors get it immediately and an outdated one
// is refreshed in the background. Only the very first request waits for the checks.
export async function getPublicStatus(): Promise<PublicStatus> {
  if (!cached) return refresh();
  if (Date.now() - cached.at >= FRESH_MS) void refresh();
  return cached.value;
}
