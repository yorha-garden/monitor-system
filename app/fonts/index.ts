import { Noto_Sans_JP, Poppins } from "next/font/google";
import localFont from "next/font/local";

const acorn = localFont({
  src: "./acorn.woff",
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

// Class names that define the --font-* variables globals.css builds its font stacks from.
export const fontVariables = `${acorn.variable} ${poppins.variable} ${notoSansJp.variable}`;
