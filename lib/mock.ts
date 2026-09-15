import type { Alarm, Machine, MaintenanceRecord } from "./types";

/** Seed data — mirrors dashboard_app.html so the ported UI looks identical. */
export const seedMachines: Machine[] = [
  { id: "m1", machine_id: "MC-0002", name: "Injection Molder 02", type: "Injection", location: "Line B", status: "Running", load_pct: 78, updated_at: "2 min ago" },
  { id: "m2", machine_id: "MC-0005", name: "Conveyor Belt 05", type: "Conveyor", location: "Line A", status: "Alarm", load_pct: 12, updated_at: "just now" },
  { id: "m3", machine_id: "MC-0011", name: "CNC Router 11", type: "CNC", location: "Line C", status: "Maintenance", load_pct: 40, updated_at: "14 min ago" },
  { id: "m4", machine_id: "MC-0007", name: "Packing Unit 07", type: "Packing", location: "Line B", status: "Stop", load_pct: 0, updated_at: "1 hr ago" },
  { id: "m5", machine_id: "MC-0003", name: "Welding Arm 03", type: "Welding", location: "Line A", status: "Running", load_pct: 91, updated_at: "5 min ago" },
];

export const seedAlarms: Alarm[] = [
  { id: "a1", machine_id: "m2", machine_name: "Conveyor Belt 05", alarm_code: "AL-1042", description: "Motor overload", occurred_at: "09:41 · today", cause: "Overcurrent trip", status: "Open" },
  { id: "a2", machine_id: "m3", machine_name: "CNC Router 11", alarm_code: "AL-1039", description: "Sensor fault", occurred_at: "08:15 · today", cause: "Proximity sensor misaligned", status: "In Progress" },
  { id: "a3", machine_id: "m4", machine_name: "Packing Unit 07", alarm_code: "AL-1040", description: "Jam detected", occurred_at: "07:52 · today", cause: "Material misfeed", status: "Open" },
  { id: "a4", machine_id: "m4", machine_name: "Packing Unit 07", alarm_code: "AL-1031", description: "E-stop triggered", occurred_at: "Yesterday", cause: "Operator initiated", status: "Closed" },
];

export const seedMaintenance: MaintenanceRecord[] = [
  { id: "t1", machine_id: "m2", machine_name: "MC-0005 · Conveyor Belt 05", maintenance_type: "Corrective", problem: "Motor bearing worn out", action_taken: "Bearing on order", technician: "Anan P.", date: "2026-09-15", status: "Waiting Part" },
  { id: "t2", machine_id: "m3", machine_name: "MC-0011 · CNC Router 11", maintenance_type: "Preventive", problem: "Quarterly sensor calibration", action_taken: "Recalibrated, tested", technician: "Suda K.", date: "2026-09-14", status: "Closed" },
  { id: "t3", machine_id: "m4", machine_name: "MC-0007 · Packing Unit 07", maintenance_type: "Corrective", problem: "E-stop circuit reset", action_taken: "Reset breaker, verified", technician: "Anan P.", date: "2026-09-13", status: "Closed" },
];
