"use client";
import { useEffect, useState, type ReactNode } from "react";

const BASE_LANDSCAPE = 1280; // ontwerpbreedte liggend
const BASE_PORTRAIT = 720; // ontwerpbreedte staand (2 kolommen tegels)

/**
 * Schaalt de hele zuil-UI mee met het scherm. Automatisch op basis van de
 * schermbreedte (liggend 1280 px = 100%, staand 720 px = 100%), of vast via `--kiosk-scale` (gezet door de
 * Kiosk-component uit de beheerinstelling) of ?scale= in de URL.
 */
export default function KioskScaler({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      const url = new URLSearchParams(window.location.search).get("scale");
      const fixed = Number(url || getComputedStyle(document.documentElement).getPropertyValue("--kiosk-scale") || 0);
      if (fixed > 0) return setScale(Math.min(4, Math.max(0.5, fixed)));
      const portrait = window.innerHeight > window.innerWidth;
      const base = portrait ? BASE_PORTRAIT : BASE_LANDSCAPE;
      setScale(Math.min(3, Math.max(0.75, window.innerWidth / base)));
    };
    compute();
    window.addEventListener("resize", compute);
    const obs = new MutationObserver(compute);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => {
      window.removeEventListener("resize", compute);
      obs.disconnect();
    };
  }, []);

  if (scale === 1) return <div className="@container h-dvh w-screen overflow-hidden">{children}</div>;
  return (
    <div className="h-dvh w-screen overflow-hidden">
      <div
        className="@container"
        style={{
          width: `${100 / scale}vw`,
          height: `${100 / scale}dvh`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
