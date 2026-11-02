"use client";
import type { ReactNode } from "react";

export function Tile({
  children,
  onClick,
  active,
  muted,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "min-h-24 rounded-md border-l-4 px-5 py-4 text-left text-2xl font-medium leading-tight shadow-sm transition active:scale-[0.98] " +
        (active
          ? "border-cw-accent-dark bg-cw-accent text-white "
          : muted
            ? "border-cw-line bg-cw-bg text-cw-muted "
            : "border-cw-accent bg-white text-cw-dark ring-1 ring-cw-line hover:bg-cw-accent-soft ") +
        className
      }
    >
      {children}
    </button>
  );
}

export function BigButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
  className?: string;
}) {
  const v = {
    primary: "bg-cw-accent text-white hover:bg-cw-accent-dark",
    secondary: "bg-cw-dark text-white hover:bg-cw-dark-2",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-20 rounded-md px-8 text-2xl font-bold uppercase tracking-wide shadow transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="flex items-center gap-4 border-b-4 border-cw-accent bg-cw-dark px-6 py-3 text-white">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-white/10 text-3xl text-white active:scale-95"
          aria-label="Terug"
        >
          ‹
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-3xl font-medium">{title}</h1>
        {subtitle && <p className="truncate text-lg text-white/70">{subtitle}</p>}
      </div>
      {right}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/coachworkz-logo.png" alt="CoachWorkz" className="ml-2 h-12 w-auto shrink-0 @3xl:h-14" />
    </header>
  );
}

export function Keypad({
  onDigit,
  onBackspace,
  onClear,
  label,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  label?: string;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];
  return (
    <div className="grid w-full max-w-sm grid-cols-3 gap-3">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => (k === "⌫" ? onBackspace() : k === "C" ? onClear?.() : onDigit(k))}
          className={
            "h-20 rounded-md text-3xl font-bold shadow-sm active:scale-95 " +
            (k === "C" || k === "⌫" ? "bg-cw-dark text-white" : "bg-white text-cw-dark ring-1 ring-cw-line active:bg-cw-accent-soft")
          }
          aria-label={k === "⌫" ? "Wissen" : k === "C" ? (label ?? "Leegmaken") : k}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "-"],
];

export function OnScreenKeyboard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const upper = value.length === 0 || /[.!?]\s*$/.test(value);
  const press = (k: string) => onChange(value + (upper ? k.toUpperCase() : k));
  return (
    <div className="flex w-full flex-col gap-2">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-2">
          {row.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="h-16 flex-1 basis-0 rounded-md bg-white text-2xl font-semibold text-cw-dark shadow-sm ring-1 ring-cw-line active:bg-cw-accent-soft"
              style={{ maxWidth: 80 }}
            >
              {upper && /[a-z]/.test(k) ? k.toUpperCase() : k}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-2">
        <button type="button" onClick={() => onChange(value.slice(0, -1))} className="h-16 w-32 rounded-md bg-cw-dark text-2xl font-semibold text-white active:bg-cw-dark-2">
          ⌫
        </button>
        <button type="button" onClick={() => onChange(value + " ")} className="h-16 flex-1 rounded-md bg-white text-xl font-semibold ring-1 ring-cw-line active:bg-cw-accent-soft" style={{ maxWidth: 420 }}>
          spatie
        </button>
        <button type="button" onClick={() => onChange("")} className="h-16 w-32 rounded-md bg-cw-dark text-xl font-semibold text-white active:bg-cw-dark-2">
          leeg
        </button>
      </div>
    </div>
  );
}

export function Spinner({ text = "Laden…" }: { text?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-cw-line border-t-cw-accent" />
      <p className="text-xl">{text}</p>
    </div>
  );
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="m-6 rounded-md bg-rose-50 p-6 text-xl text-rose-800 ring-1 ring-rose-200">
      <p>{text}</p>
      {onRetry && (
        <BigButton variant="secondary" onClick={onRetry} className="mt-4">
          Opnieuw proberen
        </BigButton>
      )}
    </div>
  );
}

export function fmtMinutes(m: number) {
  if (m <= 0) return "0 uur";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} uur` : h === 0 ? `${r} min` : `${h} uur ${r} min`;
}

/** Compacte notatie u:mm, bv. 2:15 */
export function fmtHM(m: number) {
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** Vaste actiebalk onderaan elk invoerscherm: altijd dezelfde plek voor Terug/Verder. */
export function ActionBar({ children }: { children: ReactNode }) {
  return <footer className="flex shrink-0 items-center justify-end gap-4 border-t border-cw-line bg-white px-6 py-4">{children}</footer>;
}

/** Klein versienummer rechtsonder. */
export function VersionTag() {
  return (
    <span className="pointer-events-none absolute bottom-1 right-2 text-xs text-cw-muted/80 select-none">
      v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
    </span>
  );
}
