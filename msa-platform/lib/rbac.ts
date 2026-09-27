import type { Role } from "@prisma/client";

// Coarse per-module route/nav access. This answers "can this role open
// this section at all" — it is NOT the whole story. Every data query
// underneath still scopes by ownership (a parent's Prisma `where` clause
// filters by their own children; a teacher's by their own students), so
// two parents both allowed into /students never see each other's kids.
export const MODULE_ACCESS = {
  dashboard: ["OWNER", "MANAGER", "TEACHER", "PARENT", "STUDENT"],
  students: ["OWNER", "MANAGER", "TEACHER", "PARENT", "STUDENT"],
  tasks: ["OWNER", "MANAGER", "TEACHER", "PARENT", "STUDENT"],
  attendance: ["OWNER", "MANAGER", "TEACHER", "PARENT", "STUDENT"],
  "attendance-scan": ["OWNER", "MANAGER"],
  journey: ["OWNER", "MANAGER", "TEACHER", "PARENT", "STUDENT"],
  registrations: ["OWNER", "MANAGER"],
} satisfies Record<string, Role[]>;

export type ModuleKey = keyof typeof MODULE_ACCESS;

export function canAccessModule(role: Role, moduleKey: ModuleKey): boolean {
  return (MODULE_ACCESS[moduleKey] as Role[]).includes(role);
}

// Who can act on a task's status/understanding/note. Owner and Manager
// can always intervene; a Teacher only on tasks assigned to them
// (checked against teacherId in the route handler, not here).
export function canEditTasks(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER" || role === "TEACHER";
}

export function canDecideRegistrations(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function canOperateKiosk(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}
