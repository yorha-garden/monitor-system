// Boot state shared between the inline script in the root layout and the client components.
// The script adds `booting` to <html> while the boot sequence plays, or `booted` when it is skipped
// (already seen this session, or reduced motion).

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Set on <html> by the inline script when a key or click arrives before the boot overlay hydrates.
export const SKIP_ATTRIBUTE = "data-skip";

export function isBooting() {
  return document.documentElement.classList.contains("booting");
}

// Unlike `booting`, `booted` never changes after the inline script sets it.
export function isBootSkipped() {
  return document.documentElement.classList.contains("booted");
}
