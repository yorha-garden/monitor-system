"use client";

import { useEffect, useRef, useState } from "react";
import { isBooting } from "./boot-state";

// [label, status, delay before the next line in ms]
const LINES: [string, string | null, number][] = [
  ["YoRHa GARDEN OS  ·  BUILD 2026.09.08", null, 520],
  ["LOADING — BOOTING SYSTEM...", null, 700],
  ["Commencing System Check", null, 260],
  ["Memory Unit", "GREEN", 120],
  ["Initializing Tactics Log", null, 110],
  ["Loading Zone Data", "yorhagarden.xyz", 160],
  ["Vitals", "GREEN", 120],
  ["Remaining Disk", "SUFFICIENT", 120],
  ["Black Box Temperature", "NORMAL", 110],
  ["Black Box Internal Pressure", "NORMAL", 110],
  ["Activating IFF", null, 100],
  ["Activating DNS Delegation", "COMPLETE", 140],
  ["Initializing Pod Connection", "TUNNEL 4/4", 160],
  ["Launching Staging Environment", null, 120],
  ["Activating Inertia Control System", null, 100],
  ["Activating Environmental Sensors", null, 100],
  ["Equipment Authentication", "COMPLETE", 150],
  ["Equipment Status", "GREEN", 130],
  ["All Systems Green", null, 420],
  ["Deployment Preparations Complete", null, 760],
];

function format(label: string, status: string | null) {
  if (!status) return label;
  const dots = Math.max(2, 46 - label.length - status.length);
  return `${label} ${".".repeat(dots)} ${status}`;
}

export function Boot() {
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<"running" | "out" | "gone">("running");
  const finishRef = useRef<() => void>(undefined);

  useEffect(() => {
    if (!isBooting()) return;
    const root = document.documentElement;

    let timer: number | undefined;
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      window.removeEventListener("keydown", finish);
      try {
        sessionStorage.setItem("yg-boot", "1");
      } catch {}
      root.classList.remove("booting");
      setPhase("out");
      timer = window.setTimeout(() => setPhase("gone"), 520);
    }

    let i = 0;
    function next() {
      if (i >= LINES.length) {
        timer = window.setTimeout(finish, 500);
        return;
      }
      const delay = LINES[i][2];
      i += 1;
      setShown(i);
      timer = window.setTimeout(next, delay);
    }

    finishRef.current = finish;
    window.addEventListener("keydown", finish);
    timer = window.setTimeout(next, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", finish);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      id="boot"
      className={phase === "out" ? "out" : undefined}
      aria-label="Boot sequence"
      onClick={() => finishRef.current?.()}
    >
      <pre className="blog">
        {LINES.slice(0, shown).map(([label, status]) => (
          <span key={label} className="l">
            {format(label, status)}
            {"\n"}
          </span>
        ))}
        <span className="cur"></span>
      </pre>
      <div className="bhint">Press any key to skip</div>
    </div>
  );
}
