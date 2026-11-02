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
        "min-h-24 rounded-2xl px-5 py-4 text-left text-2xl font-semibold leading-tight shadow-sm transition active:scale-[0.98] " +
        (active
          ? "bg-sky-600 text-white ring-4 ring-sky-300 "
          : muted
            ? "bg-slate-100 text-slate-400 "
            : "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-sky-50 ") +
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
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    secondary: "bg-slate-200 text-slate-800 hover:bg-slate-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-20 rounded-2xl px-8 text-2xl font-bold shadow transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-700 active:scale-95"
          aria-label="Terug"
        >
          ‹
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-lg text-slate-500">{subtitle}</p>}
      </div>
      {right}
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
            "h-20 rounded-2xl text-3xl font-bold shadow-sm active:scale-95 " +
            (k === "C" || k === "⌫" ? "bg-slate-200 text-slate-700" : "bg-white text-slate-900 ring-1 ring-slate-200")
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
              className="h-16 flex-1 basis-0 rounded-xl bg-white text-2xl font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 active:bg-sky-100"
              style={{ maxWidth: 80 }}
            >
              {upper && /[a-z]/.test(k) ? k.toUpperCase() : k}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-2">
        <button type="button" onClick={() => onChange(value.slice(0, -1))} className="h-16 w-32 rounded-xl bg-slate-200 text-2xl font-semibold active:bg-slate-300">
          ⌫
        </button>
        <button type="button" onClick={() => onChange(value + " ")} className="h-16 flex-1 rounded-xl bg-white text-xl font-semibold ring-1 ring-slate-200 active:bg-sky-100" style={{ maxWidth: 420 }}>
          spatie
        </button>
        <button type="button" onClick={() => onChange("")} className="h-16 w-32 rounded-xl bg-slate-200 text-xl font-semibold active:bg-slate-300">
          leeg
        </button>
      </div>
    </div>
  );
}

export function Spinner({ text = "Laden…" }: { text?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
      <p className="text-xl">{text}</p>
    </div>
  );
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="m-6 rounded-2xl bg-rose-50 p-6 text-xl text-rose-800 ring-1 ring-rose-200">
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
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} uur` : h === 0 ? `${r} min` : `${h} uur ${r} min`;
}
