"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Keypad } from "./ui";

export default function PairScreen() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (c: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/kiosk/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c }) });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Koppelen mislukt");
        update("");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const codeRef = useRef("");
  const update = (n: string) => {
    codeRef.current = n;
    setCode(n);
  };
  const onDigit = (d: string) => {
    if (codeRef.current.length >= 6 || busy) return;
    const n = codeRef.current + d;
    update(n);
    if (n.length === 6) submit(n);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) onDigit(e.key);
      else if (e.key === "Backspace") update(codeRef.current.slice(0, -1));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-cw-bg p-8 select-none">
      <div className="rounded-md bg-cw-dark px-10 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coachworkz-logo.png" alt="CoachWorkz" className="h-20 w-auto" />
      </div>
      <h1 className="text-4xl font-medium text-cw-dark">Zuil koppelen</h1>
      <p className="max-w-md text-center text-xl text-cw-muted">Voer de 6-cijferige koppelcode in die je in de beheeromgeving hebt aangemaakt.</p>
      <div className="text-5xl font-extrabold tracking-[0.5em] tabular-nums text-cw-dark">{code.padEnd(6, "·")}</div>
      {error && <p className="text-xl font-semibold text-rose-600">{error}</p>}
      {busy ? <p className="text-xl text-cw-muted">Koppelen…</p> : <Keypad onDigit={onDigit} onBackspace={() => update(codeRef.current.slice(0, -1))} onClear={() => update("")} />}
    </div>
  );
}
