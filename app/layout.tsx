import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YoRHa Garden",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
