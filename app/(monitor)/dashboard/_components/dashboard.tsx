import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ACCESS_JWT_HEADER, verifyAccessJwt } from "@/lib/monitor/access";
import { readMonitorConfig } from "@/lib/monitor/config";
import { isDashboardHost } from "@/lib/monitor/host";
import { loadReport } from "@/lib/monitor/report";
import { AutoRefresh } from "./auto-refresh";
import { ReportView } from "./report-view";

const REFRESH_SECONDS = 30;

// The proxy already enforces the hostname and Access token; checking again here keeps the data safe
// even if a proxy matcher change ever stops covering this route.
export async function Dashboard() {
  const requestHeaders = await headers();
  if (!isDashboardHost(requestHeaders.get("host"))) notFound();

  const access = await verifyAccessJwt(requestHeaders.get(ACCESS_JWT_HEADER));
  if (!access.ok) {
    return (
      <p className="mon-error" role="alert">
        Access denied. {access.reason}
      </p>
    );
  }

  const monitor = readMonitorConfig();
  if (!monitor.ok) {
    return (
      <div className="mon-error" role="alert">
        <p>The dashboard is not configured. Set these environment variables and restart:</p>
        <ul>
          {monitor.missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const report = await loadReport(monitor.config);
  return (
    <>
      <AutoRefresh seconds={REFRESH_SECONDS} />
      <ReportView report={report} viewer={access.email} />
    </>
  );
}
