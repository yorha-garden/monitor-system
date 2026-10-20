// The dashboard is only served on its own hostname (e.g. monitor.yorhagarden.xyz). With
// DASHBOARD_HOST unset it is not served anywhere.

export function hostnameOf(hostHeader: string | null | undefined) {
  return (hostHeader ?? "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function isDashboardHost(hostHeader: string | null | undefined, env: NodeJS.ProcessEnv = process.env) {
  const dashboardHost = env.DASHBOARD_HOST?.trim().toLowerCase();
  return Boolean(dashboardHost) && hostnameOf(hostHeader) === dashboardHost;
}
