"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isBooting } from "./boot-state";

export type Section = {
  label: string;
  jp: string;
  body: ReactNode;
};

type SectionsProps = {
  sections: Section[];
  aside: ReactNode;
};

export function Sections({ sections, aside }: SectionsProps) {
  const [active, setActive] = useState(0);
  const count = sections.length;

  // ↑/↓ cycle through sections and 1–n jump to one, but not while the boot sequence is playing.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isBooting()) return;
      if (e.key === "ArrowDown") setActive((i) => (i + 1) % count);
      else if (e.key === "ArrowUp") setActive((i) => (i - 1 + count) % count);
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= count) setActive(Number(e.key) - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count]);

  return (
    <div className="grid">
      <div>
        <ul className="menu" role="tablist" aria-label="Sections">
          {sections.map((section, i) => (
            <li
              key={section.label}
              className={i === active ? "active" : undefined}
              role="tab"
              tabIndex={0}
              aria-selected={i === active}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive(i);
                }
              }}
            >
              <span className="m"></span>
              {section.label}
              <span className="k">{String(i + 1).padStart(2, "0")}</span>
            </li>
          ))}
        </ul>
        {aside}
      </div>

      <div className="panels">
        {sections.map((section, i) => (
          <section
            key={section.label}
            className={i === active ? "panel active" : "panel"}
            role="tabpanel"
          >
            <div className="ptitle">
              <span>{section.label}</span>
              <span className="jp">{section.jp}</span>
            </div>
            <div className="pbody">{section.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
