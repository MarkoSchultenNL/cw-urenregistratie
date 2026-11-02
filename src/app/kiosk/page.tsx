import { getDeviceSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import Kiosk from "@/components/kiosk/Kiosk";
import PairScreen from "@/components/kiosk/PairScreen";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  await ensureBootstrapped();
  const dev = await getDeviceSession();
  if (!dev) return <PairScreen />;
  return <Kiosk deviceName={dev.name} />;
}
