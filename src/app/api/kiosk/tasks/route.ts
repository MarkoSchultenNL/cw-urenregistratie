import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withDevice } from "@/lib/kiosk-api";
import { getSettings } from "@/lib/settings";
import * as tl from "@/lib/teamleader/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("project");
  const employeeId = url.searchParams.get("employee");
  return withDevice(async ({ tenantId }) => {
    if (!projectId) throw new Error("project ontbreekt");
    const s = getSettings(tenantId);
    let tasks = (await tl.listTasks(tenantId, projectId)).filter((t) => t.status !== "done");
    if (s.tasksAssignedOnly && employeeId) {
      const emp = db.select().from(schema.employees).where(and(eq(schema.employees.id, employeeId), eq(schema.employees.tenantId, tenantId))).get();
      if (emp) {
        const teamIds: string[] = (() => { try { return JSON.parse(emp.tlTeamIds); } catch { return []; } })();
        const mine = tasks.filter((t) => t.assigneeUserIds.includes(emp.tlUserId) || t.assigneeTeamIds.some((id) => teamIds.includes(id)));
        if (mine.length) tasks = mine;
      }
    }
    return { tasks };
  });
}
