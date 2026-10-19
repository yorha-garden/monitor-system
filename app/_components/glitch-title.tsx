"use client";

import { useEffect, useRef } from "react";

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
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      id = window.setInterval(() => {
        const booting = document.documentElement.classList.contains("booting");
        if (!booting && Math.random() < 0.5) glitch();
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
