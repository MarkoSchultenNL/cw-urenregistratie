import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Urenregistratie" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh w-screen overflow-hidden touch-manipulation">{children}</div>;
}
