import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const acorn = localFont({
  src: "./fonts/acorn.woff",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-acorn",
});

const poppins = Poppins({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

// Only used for a few Japanese glyphs, so it is loaded on demand rather than preloaded.
const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "YoRHa Garden",
  description: "YoRHa Garden — a development and staging VPS for al.is-a.dev.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#d3cfb8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${acorn.variable} ${poppins.variable} ${notoSansJp.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
