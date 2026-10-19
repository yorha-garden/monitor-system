"use client";

import { useEffect, useRef } from "react";
import { isBooting, REDUCED_MOTION_QUERY } from "./boot-state";

export function GlitchTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  // Glitches on hover, and at random every few seconds once the boot sequence is over.
  useEffect(() => {
    const title = ref.current;
    if (!title) return;

    function glitch() {
      if (!title) return;
      title.classList.remove("glitch");
      void title.offsetWidth; // force a reflow so the animation restarts
      title.classList.add("glitch");
    }

    title.addEventListener("mouseenter", glitch);
    let id: number | undefined;
    if (!matchMedia(REDUCED_MOTION_QUERY).matches) {
      id = window.setInterval(() => {
        if (!isBooting() && Math.random() < 0.5) glitch();
      }, 7000);
    }

    return () => {
      title.removeEventListener("mouseenter", glitch);
      window.clearInterval(id);
    };
  }, []);

  return (
    <h1 ref={ref} className="title" data-text={text}>
      {text}
    </h1>
  );
}
