import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CW Urenregistratie",
  description: "Urenregistratie op een touchscreen-zuil, gekoppeld aan Teamleader Focus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
