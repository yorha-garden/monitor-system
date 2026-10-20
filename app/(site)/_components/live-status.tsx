import { connection } from "next/server";
import type { PublicStatus } from "@/lib/monitor/public-status";
import { getPublicStatus } from "@/lib/monitor/status";
import { Row } from "./row";

const VITALS = { green: "Green", degraded: "Degraded", offline: "Offline" } as const;

// Streams into the prerendered page: the status is read at request time (cached for a minute).
export async function LiveStatus() {
  await connection();
  return <StatusReadout status={await getPublicStatus()} />;
}

// Without a status (the Suspense fallback) every live value reads "Checking…".
export function StatusReadout({ status }: { status?: PublicStatus }) {
  const live = status?.state === "ok" ? status : undefined;
  const blank = status ? "—" : "Checking…";
  const percent = live && live.hostnamesTotal > 0 ? Math.round((live.hostnamesUp / live.hostnamesTotal) * 100) : 0;

  return (
    <>
      <dl className="data">
        <Row label="Vitals" ok={live?.vitals === "green"} alert={live !== undefined && live.vitals !== "green"}>
          {live ? VITALS[live.vitals] : status ? "Unknown" : blank}
        </Row>
        <Row label="Tunnels">{live ? `${live.tunnelsOnline}/${live.tunnelsTotal} online` : blank}</Row>
        <Row label="Hostnames">{live ? `${live.hostnamesUp}/${live.hostnamesTotal} answering` : blank}</Row>
        <Row label="Edge">{live ? live.edges.join(" · ") || "—" : blank}</Row>
        <Row label="Uplink">Cloudflare Tunnels</Row>
        <Row label="Last check">{live ? `${live.checkedAt.slice(11, 16)} UTC` : blank}</Row>
      </dl>
      <div className="bar" role="img" aria-label={`${percent} percent of hostnames answering`}>
        <i style={{ width: `max(0px, calc(${percent}% - 2px))` }}></i>
      </div>
      <div className="barlbl">
        <span>Hostnames answering</span>
        <span>
          {live ? `${percent}%${percent < 100 ? " — it's staging" : ""}` : status ? "Monitor offline" : blank}
        </span>
      </div>
    </>
  );
}
