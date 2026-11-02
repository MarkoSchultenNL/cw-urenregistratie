import { getDeviceSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import Kiosk from "@/components/kiosk/Kiosk";
import PairScreen from "@/components/kiosk/PairScreen";

export const dynamic = "force-dynamic";

export default async function KioskPage({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  await ensureBootstrapped();
  const { k } = await searchParams;
  const dev = await getDeviceSession(k ?? null);
  if (!dev) return <PairScreen />;
  return <Kiosk deviceName={dev.name} deviceKey={k ?? null} />;
}
