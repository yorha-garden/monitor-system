import type { ReactNode } from "react";

// One "label ........ value" line of a data list in the landing page panels. `ok` and `alert`
// mark the value with a square in the ink or alert colour.
export function Row({
  label,
  ok,
  alert,
  children,
}: {
  label: string;
  ok?: boolean;
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <span className="dots"></span>
      <dd className={ok ? "ok" : alert ? "alert" : undefined}>{children}</dd>
    </div>
  );
}
