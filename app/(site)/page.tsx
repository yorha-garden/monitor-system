import type { ReactNode } from "react";
import { Clock } from "../_components/clock";
import { GlitchTitle } from "../_components/glitch-title";
import { ModeSwitch } from "../_components/mode-switch";
import { Sections, type Section } from "../_components/sections";

const OPERATOR_URL = "https://al.is-a.dev";

function Row({ label, ok, children }: { label: string; ok?: boolean; children: ReactNode }) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <span className="dots"></span>
      <dd className={ok ? "ok" : undefined}>{children}</dd>
    </div>
  );
}

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
      <>
        <dl className="data">
          <Row label="Vitals" ok>Green</Row>
          <Row label="Uplink" ok>Tunnel · Connected</Row>
          <Row label="DNS Delegation" ok>Complete</Row>
          <Row label="Region">Jakarta · Singapore</Row>
          <Row label="Environment">Staging</Row>
          <Row label="Black Box Temp." ok>Normal</Row>
        </dl>
        <div className="bar" role="img" aria-label="Build stability 73 percent">
          <i></i>
        </div>
        <div className="barlbl">
          <span>Build stability</span>
          <span>73% — it&apos;s staging</span>
        </div>
      </>
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
              ↑↓ or 1–4 to navigate.
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
