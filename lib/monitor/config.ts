import "server-only";

export type MonitorConfig = {
  apiBaseUrl: string;
  apiToken: string;
  accountId: string;
  zoneId: string;
  domain: string;
  probeUrlTemplate: string;
};

export const REQUIRED_ENV = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_ZONE_ID",
  "MONITOR_DOMAIN",
] as const;

// Read at request time, so changing the environment only needs a restart, not a rebuild.
export function readMonitorConfig(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; config: MonitorConfig } | { ok: false; missing: string[] } {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    config: {
      apiBaseUrl: (env.CLOUDFLARE_API_BASE_URL ?? "https://api.cloudflare.com/client/v4").replace(
        /\/+$/,
        "",
      ),
      apiToken: env.CLOUDFLARE_API_TOKEN!,
      accountId: env.CLOUDFLARE_ACCOUNT_ID!,
      zoneId: env.CLOUDFLARE_ZONE_ID!,
      domain: env.MONITOR_DOMAIN!.toLowerCase(),
      probeUrlTemplate: env.MONITOR_PROBE_URL_TEMPLATE ?? "https://{hostname}/",
    },
  };
}
