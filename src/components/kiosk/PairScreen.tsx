"use client";
import { useState } from "react";
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
        setCode("");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const onDigit = (d: string) => {
    if (code.length >= 6) return;
    const n = code + d;
    setCode(n);
    if (n.length === 6) submit(n);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-slate-50 p-8 select-none">
      <h1 className="text-4xl font-bold text-slate-900">Zuil koppelen</h1>
      <p className="max-w-md text-center text-xl text-slate-500">Voer de 6-cijferige koppelcode in die je in de beheeromgeving hebt aangemaakt.</p>
      <div className="text-5xl font-black tracking-[0.5em] tabular-nums text-slate-900">{code.padEnd(6, "·")}</div>
      {error && <p className="text-xl font-semibold text-rose-600">{error}</p>}
      {busy ? <p className="text-xl text-slate-500">Koppelen…</p> : <Keypad onDigit={onDigit} onBackspace={() => setCode((c) => c.slice(0, -1))} onClear={() => setCode("")} />}
    </div>
  );
}
