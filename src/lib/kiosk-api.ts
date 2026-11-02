import { NextResponse } from "next/server";
import { getDeviceSession } from "@/lib/auth";
import { NotConnectedError, TeamleaderError } from "@/lib/teamleader/types";

/** Gemeenschappelijke wrapper voor zuil-routes: apparaat moet gekoppeld zijn. */
export async function withDevice<T>(
  fn: (ctx: { tenantId: string; deviceId: string }) => Promise<T>,
): Promise<NextResponse> {
  const dev = await getDeviceSession();
  if (!dev) return NextResponse.json({ error: "Zuil is niet gekoppeld", code: "unpaired" }, { status: 401 });
  try {
    const data = await fn(dev);
    if (data instanceof NextResponse) return data;
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof NotConnectedError) {
      return NextResponse.json({ error: "Teamleader is niet gekoppeld. Vraag de beheerder.", code: "tl_not_connected" }, { status: 503 });
    }
    if (e instanceof TeamleaderError) {
      console.error("[kiosk] teamleader", e.message);
      return NextResponse.json({ error: "Teamleader gaf een fout: " + e.message, code: "tl_error" }, { status: 502 });
    }
    console.error("[kiosk]", e);
    return NextResponse.json({ error: (e as Error).message ?? "Onbekende fout", code: "error" }, { status: 500 });
  }
}
