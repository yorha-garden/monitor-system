import type { ReactNode } from "react";

// One "label ........ value" line of a data list in the landing page panels.
export function Row({ label, ok, children }: { label: string; ok?: boolean; children: ReactNode }) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <span className="dots"></span>
      <dd className={ok ? "ok" : undefined}>{children}</dd>
    </div>
  );
}
