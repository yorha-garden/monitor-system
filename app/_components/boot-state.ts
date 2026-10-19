// Boot state shared between the inline script in the root layout and the client components.
// The script adds `booting` to <html> while the boot sequence plays, or `booted` when it is skipped
// (already seen this session, or reduced motion).

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function isBooting() {
  return document.documentElement.classList.contains("booting");
}
