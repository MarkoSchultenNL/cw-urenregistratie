import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Urenregistratie" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Huisstijl-lettertype van coachworkz.nl */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      <div className="h-dvh w-screen overflow-hidden touch-manipulation font-cw text-cw-dark">{children}</div>
    </>
  );
}
