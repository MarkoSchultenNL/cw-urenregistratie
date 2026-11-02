"use client";
import { useEffect, useState } from "react";
import QR from "qrcode";

/** Rendert een QR-code als afbeelding (client-side, geen externe dienst). */
export default function QrCode({ value, size = 256 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QR.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((d) => alive && setSrc(d))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse rounded-xl bg-slate-100" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="QR-code naar de upload-link" />;
}
