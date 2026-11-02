import type { Metadata, Viewport } from "next";
import KioskScaler from "@/components/kiosk/KioskScaler";

export const metadata: Metadata = { title: "Urenregistratie" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="touch-manipulation font-cw text-cw-dark">
        <KioskScaler>{children}</KioskScaler>
      </div>
    </>
  );
}
