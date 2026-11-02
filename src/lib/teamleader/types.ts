export type TlUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: "active" | "deactivated";
};

export type TlProject = {
  id: string;
  title: string;
  project_key?: number;
  status: "open" | "closed";
};

export type TlTask = {
  id: string;
  title: string;
  projectId: string;
  status: "to_do" | "in_progress" | "on_hold" | "done";
  workTypeId: string | null;
};

export type TlProduct = {
  id: string;
  name: string;
  code: string | null;
  unitId: string | null;
  updatedAt?: string | null;
};

export type TlCustomFieldDefinition = {
  id: string;
  context: string;
  type: string;
  label: string;
  options?: { id: string; value: string }[];
};

export type TlCustomFieldValue = { definitionId: string; value: unknown };

export type TlMe = {
  id: string;
  accountId: string;
  email: string;
  timeZone: string;
  historicLimitHours: number | null;
};

export class TeamleaderError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "TeamleaderError";
  }
}

export class NotConnectedError extends Error {
  constructor() {
    super("Teamleader is niet gekoppeld");
    this.name = "NotConnectedError";
  }
}
