import type { Metadata, Viewport } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Monitor · YoRHa Garden",
  description: "Cloudflare tunnel and connector status for YoRHa Garden.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#d3cfb8",
};

// Restores the saved display mode before first paint (the dashboard has no boot sequence).
const modeScript = `try { if (localStorage.getItem("yg-inv") === "1") document.documentElement.classList.add("inv"); } catch (e) {}`;

export default function MonitorLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: modeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
