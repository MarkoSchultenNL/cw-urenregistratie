import { withDevice } from "@/lib/kiosk-api";
import * as tl from "@/lib/teamleader/client";

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("project");
  return withDevice(async ({ tenantId }) => {
    if (!projectId) throw new Error("project ontbreekt");
    const tasks = await tl.listTasks(tenantId, projectId);
    return { tasks: tasks.filter((t) => t.status !== "done") };
  });
}
