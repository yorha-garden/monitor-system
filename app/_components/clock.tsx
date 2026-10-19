"use client";

import { useEffect, useState } from "react";

// Renders a placeholder on the server and starts ticking once mounted, so the markup always hydrates.
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const iso = now?.toISOString();
  return <time dateTime={iso ?? ""}>{iso ? iso.slice(11, 19) : "--:--:--"}</time>;
}
