import { Suspense } from "react";
import { Clock } from "../_components/clock";
import { GlitchTitle } from "../_components/glitch-title";
import { ModeSwitch } from "../_components/mode-switch";
import { Sections, type Section } from "../_components/sections";
import { LiveStatus, StatusReadout } from "./_components/live-status";
import { Row } from "./_components/row";

const OPERATOR_URL = "https://al.is-a.dev";
const MONITOR_URL = "https://monitor.yorhagarden.xyz";

const SECTIONS: Section[] = [
  {
    label: "System",
    jp: "システム",
    body: (
      <>
        <p>
          YoRHa Garden is a development and staging VPS operated for <strong>al.is-a.dev</strong>.
          Everything running here is unfinished by design — builds are tested, broken, and rebuilt
          before anything reaches production.
        </p>
        <dl className="data">
          <Row label="Unit">YoRHa Garden</Row>
          <Row label="Designation">yorhagarden.xyz</Row>
          <Row label="Purpose">Development / Staging</Row>
          <Row label="Operator">
            <a href={OPERATOR_URL}>al.is-a.dev</a>
          </Row>
        </dl>
      </>
    ),
  },
  {
    label: "Status",
    jp: "状態",
    body: (
      <Suspense fallback={<StatusReadout />}>
        <LiveStatus />
      </Suspense>
    ),
  },
  {
    label: "Access",
    jp: "アクセス",
    body: (
      <>
        <p>
          Restricted. This is not a production system. Endpoints appear, change and vanish without
          notice. If you were looking for something that works, you want the operator&apos;s site.
        </p>
        <dl className="data">
          <Row label="Clearance">Authorized units only</Row>
          <Row label="Public index">None</Row>
          <Row label="Stability">Not guaranteed</Row>
        </dl>
      </>
    ),
  },
  {
    label: "Operator",
    jp: "管理者",
    body: (
      <>
        <a className="big" href={OPERATOR_URL}>
          <span className="sq"></span>al.is-a.dev
        </a>
        <p>All finished work lives at al.is-a.dev. This garden is where it grows first.</p>
      </>
    ),
  },
  {
    label: "Monitor",
    jp: "監視",
    body: (
      <>
        <a className="big" href={MONITOR_URL}>
          <span className="sq"></span>monitor ↗
        </a>
        <p>
          Live tunnel, connector and uptime status for every unit of the garden, across all of its
          servers. Restricted to authorized units: sign-in goes through Cloudflare Access.
        </p>
        <dl className="data">
          <Row label="Watches">Tunnels · Connectors · Uptime · Traffic</Row>
          <Row label="Refresh">Every 30 s</Row>
          <Row label="Clearance">Cloudflare Access</Row>
        </dl>
      </>
    ),
  },
];

export default function Home() {
  return (
    <main className="os">
      <header className="topbar">
        <div className="brand">
          <span className="sq"></span>YoRHa <span className="jp">ヨルハ</span>
        </div>
        <div className="sys">
          <ModeSwitch />
          <span>SYSTEM ONLINE</span>
          <span aria-hidden="true">·</span>
          <Clock />
          <span>UTC</span>
          <span aria-hidden="true">·</span>
          <a className="sys-link" href={MONITOR_URL}>
            MONITOR ↗
          </a>
        </div>
      </header>

      <div className="frame">
        <i className="c c1"></i>
        <i className="c c2"></i>
        <i className="c c3"></i>
        <i className="c c4"></i>

        <div className="hero">
          <GlitchTitle text="YoRHa GARDEN" />
          <p className="sub">
            Development · staging unit
            <br />
            for <a href={OPERATOR_URL}>al.is-a.dev</a>
          </p>
        </div>

        <Sections
          sections={SECTIONS}
          aside={
            <aside className="pod">
              <b>POD 042 · PROPOSAL</b>
              This unit is under construction.
              <br />
              Recommend: observe, do not rely.
              <br />
              ↑↓ or 1–5 to navigate.
            </aside>
          }
        />
      </div>

      <footer>
        <div className="hazard" aria-hidden="true"></div>
        <div className="fmeta">
          <span className="nb">YoRHa Garden · yorhagarden.xyz</span>
          <span>
            Glory to Mankind <span className="jp">人類に栄光あれ</span>
          </span>
          <span>Dev / Staging</span>
        </div>
      </footer>
    </main>
  );
}
