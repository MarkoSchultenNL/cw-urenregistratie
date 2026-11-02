import { NextResponse } from "next/server";
import { pairDevice } from "@/lib/auth";

export async function POST(req: Request) {
  const { code } = (await req.json()) as { code?: string };
  if (!code || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Ongeldige koppelcode" }, { status: 400 });
  const r = await pairDevice(code);
  if (!r) return NextResponse.json({ error: "Koppelcode onbekend of al gebruikt" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
