import { Suspense } from "react";
import { Clock } from "@/app/_components/clock";
import { ModeSwitch } from "@/app/_components/mode-switch";
import { Dashboard } from "./_components/dashboard";

export default function DashboardPage() {
  return (
    <main className="os">
      <header className="topbar">
        <div className="brand">
          <span className="sq"></span>YoRHa <span className="jp">ヨルハ</span>
        </div>
        <div className="sys">
          <ModeSwitch />
          <span>MONITOR</span>
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
          <h1 className="title mon-title" data-text="MONITOR">
            MONITOR
          </h1>
          <p className="sub">
            Tunnel &amp; connector status
            <br />
            <span className="jp">管制システム</span>
          </p>
        </div>

        <Suspense fallback={<p className="mon-loading">Establishing pod link…</p>}>
          <Dashboard />
        </Suspense>
      </div>

      <footer>
        <div className="hazard" aria-hidden="true"></div>
        <div className="fmeta">
          <span className="nb">YoRHa Garden · monitor</span>
          <span>
            Glory to Mankind <span className="jp">人類に栄光あれ</span>
          </span>
          <span>Restricted</span>
        </div>
      </footer>
    </main>
  );
}
