import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CW Urenregistratie",
  description: "Urenregistratie op een touchscreen-zuil, gekoppeld aan Teamleader Focus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-full flex-col bg-cw-bg text-slate-900">{children}</body>
    </html>
  );
}
