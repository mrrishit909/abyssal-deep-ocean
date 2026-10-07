import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ABYSSAL: deep-ocean exploration", description: "Dive replays, sonar and a submersible fleet, in one descent. All data is synthetic." };
export const viewport: Viewport = { themeColor: "#02080D", width: "device-width", initialScale: 1 };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
