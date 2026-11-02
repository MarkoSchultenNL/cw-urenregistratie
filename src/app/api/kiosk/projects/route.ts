import { withDevice } from "@/lib/kiosk-api";
import * as tl from "@/lib/teamleader/client";

export async function GET() {
  return withDevice(async ({ tenantId }) => ({ projects: await tl.listProjects(tenantId) }));
}
