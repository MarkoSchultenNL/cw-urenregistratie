import { withDevice } from "@/lib/kiosk-api";
import * as tl from "@/lib/teamleader/client";

export async function GET() {
  return withDevice(async ({ tenantId }) => ({ products: await tl.listProducts(tenantId) }));
}
