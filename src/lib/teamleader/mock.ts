import type { TlCustomFieldDefinition, TlCustomFieldValue, TlMe, TlProduct, TlProject, TlTask, TlUser } from "./types";

/** Nepdata om de zuil en het beheer te testen zonder Teamleader-koppeling (TEAMLEADER_MOCK=1). */
const users: TlUser[] = [
  { id: "u-1", first_name: "Jan", last_name: "de Vries", email: "jan@example.com", status: "active" },
  { id: "u-2", first_name: "Fatima", last_name: "El Amrani", email: "fatima@example.com", status: "active" },
  { id: "u-3", first_name: "Pieter", last_name: "Bakker", email: "pieter@example.com", status: "active" },
  { id: "u-4", first_name: "Sanne", last_name: "Jansen", email: "sanne@example.com", status: "active" },
  { id: "u-5", first_name: "Mohammed", last_name: "Yilmaz", email: "mo@example.com", status: "active" },
  { id: "u-6", first_name: "Lotte", last_name: "Visser", email: "lotte@example.com", status: "active" },
];

const projects: TlProject[] = [
  { id: "p-1", title: "Verbouwing kantoor Oss", project_key: 101, status: "open" },
  { id: "p-2", title: "Onderhoud machines hal 2", project_key: 102, status: "open" },
  { id: "p-3", title: "Nieuwbouw loods Heesch", project_key: 103, status: "open" },
];

const tasks: TlTask[] = [
  { id: "t-1", title: "Sloopwerk", projectId: "p-1", status: "in_progress", workTypeId: null, assigneeUserIds: ["u-1","u-3"], assigneeTeamIds: [] },
  { id: "t-2", title: "Elektra", projectId: "p-1", status: "to_do", workTypeId: null, assigneeUserIds: ["u-1"], assigneeTeamIds: [] },
  { id: "t-3", title: "Stucwerk", projectId: "p-1", status: "to_do", workTypeId: null, assigneeUserIds: ["u-2"], assigneeTeamIds: [] },
  { id: "t-4", title: "Afwerking", projectId: "p-1", status: "done", workTypeId: null, assigneeUserIds: ["u-1"], assigneeTeamIds: [] },
  { id: "t-5", title: "Inspectie", projectId: "p-2", status: "in_progress", workTypeId: null, assigneeUserIds: ["u-2","u-4"], assigneeTeamIds: [] },
  { id: "t-6", title: "Reparatie", projectId: "p-2", status: "to_do", workTypeId: null, assigneeUserIds: ["u-3"], assigneeTeamIds: [] },
  { id: "t-7", title: "Fundering", projectId: "p-3", status: "in_progress", workTypeId: null, assigneeUserIds: ["u-1","u-5"], assigneeTeamIds: [] },
  { id: "t-8", title: "Staalconstructie", projectId: "p-3", status: "to_do", workTypeId: null, assigneeUserIds: ["u-6"], assigneeTeamIds: [] },
  { id: "t-9", title: "Dakbedekking", projectId: "p-3", status: "to_do", workTypeId: null, assigneeUserIds: [], assigneeTeamIds: [] },
];

const products: TlProduct[] = [
  { id: "a-1", name: "Schroeven 4x40 (doos 200)", code: "SCH-440", unitId: null },
  { id: "a-2", name: "Kit transparant 310ml", code: "KIT-T", unitId: null },
  { id: "a-3", name: "Gipsplaat 2600x1200", code: "GIPS-26", unitId: null },
  { id: "a-4", name: "Kabel 3x2.5 (meter)", code: "KAB-325", unitId: null },
  { id: "a-5", name: "Primer 5L", code: "PRIM-5", unitId: null },
  { id: "a-6", name: "Slijpschijf 125mm", code: "SLIJP-125", unitId: null },
  { id: "a-7", name: "Tape 50mm", code: "TAPE-50", unitId: null },
  { id: "a-8", name: "Kantoorpapier A4", code: "PAP-A4", unitId: null },
  { id: "a-9", name: "Koffiebonen 1kg", code: "KOF-1", unitId: null },
];
// Custom field "Bedrijfsentiteit" (single_select) per artikel
const entity: Record<string, string> = { "a-1": "Coachworkz", "a-2": "Coachworkz", "a-3": "Classic Plaza", "a-4": "Coachworkz", "a-5": "Coachworkz", "a-6": "Coachworkz", "a-7": "Coachworkz", "a-8": "Holding", "a-9": "Holding" };

let counter = 1;
export const mockApi = {
  me: async (): Promise<TlMe> => ({
    id: "u-1",
    accountId: "acc-mock",
    email: "admin@example.com",
    timeZone: "Europe/Amsterdam",
    historicLimitHours: 24,
  }),
  users: async () => users,
  projects: async () => projects,
  tasks: async (projectId: string) => tasks.filter((t) => t.projectId === projectId),
  products: async (_updatedSince?: string) => products,
  productCustomFields: async (id: string): Promise<TlCustomFieldValue[]> => (entity[id] ? [{ definitionId: "cfd-entiteit", value: entity[id] }] : []),
  customFieldDefinitions: async (context: string): Promise<TlCustomFieldDefinition[]> =>
    context === "product"
      ? [{ id: "cfd-entiteit", context: "product", type: "single_select", label: "Bedrijfsentiteit", options: [{ id: "o1", value: "Coachworkz" }, { id: "o2", value: "Classic Plaza" }, { id: "o3", value: "Holding" }] }]
      : [],
  addTime: async (input: unknown) => {
    console.log("[mock] timeTracking.add", JSON.stringify(input));
    return `mock-tt-${counter++}`;
  },
  addMaterial: async (input: unknown) => {
    console.log("[mock] materials.create", JSON.stringify(input));
    return `mock-mat-${counter++}`;
  },
};
