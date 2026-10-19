"use client";

// The saved mode is applied before first paint by the inline script in the root layout.
export function ModeSwitch() {
  function toggle() {
    const on = document.documentElement.classList.toggle("inv");
    try {
      localStorage.setItem("yg-inv", on ? "1" : "0");
    } catch {}
  }

  return (
    <button
      type="button"
      className="blink"
      title="Toggle display mode"
      aria-label="Toggle display mode"
      onClick={toggle}
    ></button>
  );
}
