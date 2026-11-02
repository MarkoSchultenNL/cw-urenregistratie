import type { ReactNode } from "react";

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold">{children}</h1>
      {actions}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</section>;
}

export function Btn({ children, variant = "primary", className = "", ...rest }: { children: ReactNode; variant?: "primary" | "secondary" | "danger"; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];
  return (
    <button className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${v} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Notice({ kind, children }: { kind: "ok" | "error" | "info"; children: ReactNode }) {
  const c = { ok: "bg-emerald-50 text-emerald-800 ring-emerald-200", error: "bg-rose-50 text-rose-800 ring-rose-200", info: "bg-sky-50 text-sky-800 ring-sky-200" }[kind];
  return <div className={`mb-4 rounded-lg p-3 text-sm ring-1 ${c}`}>{children}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const c = { synced: "bg-emerald-100 text-emerald-800", pending: "bg-slate-100 text-slate-700", error: "bg-rose-100 text-rose-800" }[status] ?? "bg-slate-100";
  const t = { synced: "In Teamleader", pending: "Wacht", error: "Fout" }[status] ?? status;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{t}</span>;
}

export const fmtMin = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
export const fmtDateTime = (iso: string | null) => (iso ? new Date(iso.includes("T") ? iso : iso + "Z").toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" }) : "—");
