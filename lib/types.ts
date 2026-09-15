export type Role = string;

export type MachineStatus = "Running" | "Stop" | "Alarm" | "Maintenance";
export type AlarmStatus = "Open" | "In Progress" | "Closed";
export type MaintenanceType = "Preventive" | "Corrective" | "Emergency";
export type MaintenanceStatus = "Open" | "In Progress" | "Closed" | "Waiting Part";

export interface Profile {
  id: string;
  email: string;
  role: Role;
  display_name: string;
}

export interface Machine {
  id: string;
  machine_id: string;
  name: string;
  type: string;
  location: string;
  status: MachineStatus;
  load_pct?: number;
  updated_at: string;
}

export interface Alarm {
  id: string;
  machine_id: string; // FK -> machines.id (mock uses machine display key)
  machine_name: string;
  alarm_code: string;
  description: string;
  occurred_at: string;
  cause: string;
  status: AlarmStatus;
}

export interface MaintenanceRecord {
  id: string;
  machine_id: string;
  machine_name: string;
  maintenance_type: MaintenanceType;
  problem: string;
  action_taken: string;
  technician: string;
  date: string; // YYYY-MM-DD
  status: MaintenanceStatus;
}

export const MACHINE_STATUSES: MachineStatus[] = ["Running", "Stop", "Alarm", "Maintenance"];
export const ALARM_STATUSES: AlarmStatus[] = ["Open", "In Progress", "Closed"];
export const MAINT_TYPES: MaintenanceType[] = ["Preventive", "Corrective", "Emergency"];
export const MAINT_STATUSES: MaintenanceStatus[] = ["Open", "In Progress", "Closed", "Waiting Part"];

/* ---------------- Roles & permissions ---------------- */
export interface RoleRow {
  name: string;
  display_name: string;
  permissions: Record<string, boolean>;
  is_builtin: boolean;
}

export const PERMISSION_KEYS: { key: string; label: string }[] = [
  { key: "machines.manage", label: "Manage machines (add/edit/delete)" },
  { key: "alarms.status", label: "Change alarm status" },
  { key: "alarms.delete", label: "Delete alarms" },
  { key: "maintenance.edit", label: "Create/edit maintenance" },
  { key: "maintenance.delete", label: "Delete maintenance" },
  { key: "users.manage", label: "Manage users & roles" },
  { key: "roles.manage", label: "Create/edit roles" },
  { key: "export", label: "Export CSV" },
];

const ALL_TRUE: Record<string, boolean> = Object.fromEntries(
  PERMISSION_KEYS.map((p) => [p.key, true])
);

export const DEMO_ROLE_PERMS: Record<string, Record<string, boolean>> = {
  admin: { ...ALL_TRUE },
  technician: {
    ...Object.fromEntries(PERMISSION_KEYS.map((p) => [p.key, false])),
    "alarms.status": true,
    "maintenance.edit": true,
    export: true,
  },
  viewer: {
    ...Object.fromEntries(PERMISSION_KEYS.map((p) => [p.key, false])),
    export: true,
  },
};

export const seedRoles: RoleRow[] = [
  { name: "admin", display_name: "Administrator", permissions: DEMO_ROLE_PERMS.admin, is_builtin: true },
  { name: "technician", display_name: "Technician", permissions: DEMO_ROLE_PERMS.technician, is_builtin: true },
  { name: "viewer", display_name: "Viewer (read-only)", permissions: DEMO_ROLE_PERMS.viewer, is_builtin: true },
];
