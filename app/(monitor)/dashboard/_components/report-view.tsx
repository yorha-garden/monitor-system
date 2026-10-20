import { formatDuration, type Tunnel } from "@/lib/monitor/model";
import type { Report } from "@/lib/monitor/report";

const STATUS_LABEL: Record<Tunnel["status"], string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  inactive: "Inactive",
};

const number = new Intl.NumberFormat("en-US");

function utc(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function Since({ iso, now }: { iso: string | null; now: Date }) {
  if (!iso) return <>—</>;
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={utc(date)}>
      {formatDuration(now.getTime() - date.getTime())}
    </time>
  );
}

function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={alert ? "mon-stat mon-stat--alert" : "mon-stat"}>
      <dt>{label}</dt>
      <dd>
        {value}
        {sub ? <span>{sub}</span> : null}
      </dd>
    </div>
  );
}

function TunnelPanel({ tunnel, report }: { tunnel: Tunnel; report: Report }) {
  const { traffic, probes, generatedAt } = report;

  return (
    <section className="mon-tunnel" aria-label={`Tunnel ${tunnel.name}`}>
      <div className="ptitle">
        <span>{tunnel.name}</span>
        <span className={`mon-status mon-status--${tunnel.status}`}>{STATUS_LABEL[tunnel.status]}</span>
      </div>
      <div className="pbody">
        <h3 className="mon-h">
          Connectors <span>{tunnel.connectors.length}</span>
        </h3>
        {tunnel.connectors.length === 0 ? (
          <p className="mon-empty">
            No cloudflared connected
            {tunnel.inactiveAt ? (
              <>
                {" "}
                for <Since iso={tunnel.inactiveAt} now={generatedAt} />
              </>
            ) : null}
            .
          </p>
        ) : (
          <div className="mon-scroll">
            <table className="mon-table">
              <thead>
                <tr>
                  <th>Server</th>
                  <th>Up</th>
                  <th>Edges</th>
                  <th>Version</th>
                  <th>Arch</th>
                </tr>
              </thead>
              <tbody>
                {tunnel.connectors.map((c) => (
                  <tr key={c.id}>
                    <td className="mon-strong">{c.originIps.join(", ") || "—"}</td>
                    <td>
                      <Since iso={c.runAt} now={generatedAt} />
                    </td>
                    <td>{c.edges.join(" ") || "—"}</td>
                    <td>{c.version}</td>
                    <td>{c.arch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mon-h">
          Routes <span>{tunnel.routes.length}</span>
        </h3>
        <div className="mon-scroll">
          <table className="mon-table">
            <thead>
              <tr>
                <th>Hostname</th>
                <th>Check</th>
                <th className="mon-num">Latency</th>
                <th className="mon-num">Req 24h</th>
                <th className="mon-num">4xx</th>
                <th className="mon-num">5xx</th>
                <th>Service</th>
              </tr>
            </thead>
            <tbody>
              {tunnel.routes.map((route) => {
                const probe = probes[route.hostname];
                const t = traffic?.[route.hostname];
                return (
                  <tr key={`${route.hostname}${route.path ?? ""}`}>
                    <td className="mon-strong">
                      {route.hostname}
                      {route.path ? <span className="mon-path">{route.path}</span> : null}
                    </td>
                    <td>
                      {probe ? (
                        <span className={`mon-check mon-check--${probe.state}`}>
                          {probe.state === "up" ? "Up" : "Down"}
                          <span>{probe.status ?? probe.error}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mon-num">{probe ? `${probe.ms} ms` : "—"}</td>
                    <td className="mon-num">{traffic ? number.format(t?.requests ?? 0) : "—"}</td>
                    <td className="mon-num">{traffic ? number.format(t?.clientErrors ?? 0) : "—"}</td>
                    <td className={t?.serverErrors ? "mon-num mon-alert" : "mon-num"}>
                      {traffic ? number.format(t?.serverErrors ?? 0) : "—"}
                    </td>
                    <td>{route.service}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function ReportView({ report, viewer }: { report: Report; viewer?: string }) {
  const { tunnels, traffic, probes } = report;
  const healthy = tunnels.filter((t) => t.status === "healthy").length;
  const connectors = tunnels.flatMap((t) => t.connectors);
  const servers = new Set(connectors.flatMap((c) => c.originIps)).size;
  const checks = Object.values(probes);
  const up = checks.filter((p) => p.state === "up").length;
  const totals = Object.values(traffic ?? {}).reduce(
    (sum, t) => ({ requests: sum.requests + t.requests, serverErrors: sum.serverErrors + t.serverErrors }),
    { requests: 0, serverErrors: 0 },
  );

  return (
    <div className="mon-report">
      <dl className="mon-summary">
        <Stat label="Tunnels healthy" value={`${healthy}/${tunnels.length}`} alert={healthy < tunnels.length} />
        <Stat label="Connectors" value={String(connectors.length)} sub={`${servers} server${servers === 1 ? "" : "s"}`} />
        <Stat label="Hostnames up" value={`${up}/${checks.length}`} alert={up < checks.length} />
        <Stat label="Requests 24h" value={traffic ? number.format(totals.requests) : "—"} />
        <Stat
          label="5xx 24h"
          value={traffic ? number.format(totals.serverErrors) : "—"}
          alert={totals.serverErrors > 0}
        />
      </dl>

      <p className="mon-meta">
        {report.domain} · updated <time dateTime={report.generatedAt.toISOString()}>{utc(report.generatedAt)}</time> ·
        refreshes every 30 s{viewer ? ` · ${viewer}` : ""}
      </p>

      {report.errors.map((error) => (
        <p key={error} className="mon-error" role="alert">
          {error}
        </p>
      ))}

      {tunnels.length === 0 && report.errors.length === 0 ? (
        <p className="mon-empty">No remotely managed tunnels route any {report.domain} hostname.</p>
      ) : null}

      {tunnels.map((tunnel) => (
        <TunnelPanel key={tunnel.id} tunnel={tunnel} report={report} />
      ))}
    </div>
  );
}
