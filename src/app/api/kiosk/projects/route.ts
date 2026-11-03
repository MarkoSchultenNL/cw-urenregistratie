import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withDevice } from "@/lib/kiosk-api";
import { getSettings } from "@/lib/settings";
import * as tl from "@/lib/teamleader/client";

/** Projecten voor de zuil; met ?employee= alleen projecten met open taken van die medewerker (instelbaar). */
export async function GET(req: Request) {
  const employeeId = new URL(req.url).searchParams.get("employee");
  return withDevice(async ({ tenantId }) => {
    const s = getSettings(tenantId);
    if (s.projectsAssignedOnly && employeeId) {
      const emp = db.select().from(schema.employees).where(and(eq(schema.employees.id, employeeId), eq(schema.employees.tenantId, tenantId))).get();
      if (emp) {
        const teamIds: string[] = (() => { try { return JSON.parse(emp.tlTeamIds); } catch { return []; } })();
        const r = await tl.projectsForUser(tenantId, emp.tlUserId, teamIds);
        return { projects: r.projects, filtered: true };
      }
    }
    return { projects: await tl.listProjects(tenantId), filtered: false };
  });
}
