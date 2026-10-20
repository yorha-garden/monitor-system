import type { Metadata, Viewport } from "next";
import { Boot } from "../_components/boot";
import { REDUCED_MOTION_QUERY, SKIP_ATTRIBUTE } from "../_components/boot-state";
import { fontVariables } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "YoRHa Garden",
  description: "YoRHa Garden — a development and staging VPS for al.is-a.dev.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#d3cfb8",
};

// Runs before first paint: restores the saved display mode and decides whether the boot sequence
// plays (locking scrolling while it does), so neither flashes in before hydration. While it plays,
// a key or click is recorded on <html> so Boot can still skip it if it arrives before hydration.
const bootScript = `(function () {
  var root = document.documentElement;
  try { if (localStorage.getItem("yg-inv") === "1") root.classList.add("inv"); } catch (e) {}
  var seen = false;
  try { seen = sessionStorage.getItem("yg-boot") === "1"; } catch (e) {}
  var reduced = matchMedia(${JSON.stringify(REDUCED_MOTION_QUERY)}).matches;
  root.classList.add(seen || reduced ? "booted" : "booting");
  if (seen || reduced) return;
  function skip() {
    removeEventListener("keydown", skip, true);
    removeEventListener("click", skip, true);
    if (root.classList.contains("booting")) root.setAttribute("${SKIP_ATTRIBUTE}", "");
  }
  addEventListener("keydown", skip, true);
  addEventListener("click", skip, true);
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <Boot />
        {children}
      </body>
    </html>
  );
}
