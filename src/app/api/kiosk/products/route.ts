import { withDevice } from "@/lib/kiosk-api";
import { kioskProducts } from "@/lib/products-sync";

export async function GET() {
  return withDevice(async ({ tenantId }) => ({ products: await kioskProducts(tenantId) }));
}
