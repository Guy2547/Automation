"use client";

import { useEffect } from "react";
import {
  createAlarm,
  listAlarms,
  listMachines,
  updateMachine,
} from "./store";
import { logActivity } from "./activity";
import { seedMachines } from "./mock";
import type { Machine } from "./types";

export const TICK_MS = 3000;
const SIM_KEY = "amms.sim";
const LIVE_KEY = "amms.simLive";
const M_KEY = "amms.machines";

interface Pending {
  id: string;
  stage: "alarm-hold" | "repair";
  left: number;
}
interface SimState {
  cooldown: number;
  pending: Pending | null;
}

const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function readSim(): SimState {
  try {
    const raw = localStorage.getItem(SIM_KEY);
    if (raw) {
      const s = JSON.parse(raw) as SimState;
      if (typeof s.cooldown === "number") return { cooldown: s.cooldown, pending: s.pending ?? null };
    }
  } catch {
    /* ignore */
  }
  return { cooldown: 0, pending: null };
}
function writeSim(s: SimState) {
  try {
    localStorage.setItem(SIM_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const FAULTS: Array<[string, string]> = [
  ["Motor overload", "Overcurrent trip"],
  ["Sensor fault", "Proximity sensor misaligned"],
  ["Overheat", "Cooling fan failure"],
  ["Vibration high", "Bearing wear"],
  ["Pressure drop", "Air leak in line"],
];

function nextAlarmCode(): string {
  const used = new Set(listAlarms().map((a) => a.alarm_code.toLowerCase()));
  for (let i = 0; i < 50; i++) {
    const code = `AL-${rnd(1000, 9999)}`;
    if (!used.has(code.toLowerCase())) return code;
  }
  return `AL-${Date.now().toString().slice(-6)}`;
}

function stampNow(): string {
  try {
    return `${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} · today`;
  } catch {
    return "just now";
  }
}

/** Advance the simulation one tick. Returns true if anything changed. Persists to localStorage. */
export function tickSimulator(): boolean {
  const machines = listMachines();
  if (machines.length === 0) return false;
  const byId = new Map(machines.map((m) => [m.id, m]));
  let changed = false;
  const touch = (m: Machine, patch: Partial<Machine>) => {
    try {
      updateMachine(m.id, { ...patch, updated_at: "just now" });
      changed = true;
    } catch {
      /* deleted mid-tick — ignore */
    }
  };

  // 1) load drift on running machines (small, natural)
  for (const m of machines) {
    if (m.status === "Running") {
      const next = clamp((m.load_pct ?? 70) + rnd(-4, 4), 5, 98);
      if (next !== m.load_pct) touch(m, { load_pct: next });
    }
  }

  const sim = readSim();
  if (sim.cooldown > 0) sim.cooldown -= 1;

  // 2) advance in-progress repair/fault
  if (sim.pending) {
    const m = byId.get(sim.pending.id);
    if (!m) {
      sim.pending = null;
    } else {
      sim.pending.left -= 1;
      if (sim.pending.left <= 0) {
        if (sim.pending.stage === "alarm-hold") {
          touch(m, { status: "Maintenance", load_pct: 0 });
          void logActivity("alarm.status", `${m.machine_id} → Maintenance`);
          sim.pending = { id: m.id, stage: "repair", left: rnd(5, 15) }; // ~15–45s random
        } else {
          touch(m, { status: "Running", load_pct: rnd(55, 70) });
          void logActivity("maintenance.update", `${m.machine_id} repaired → Running`);
          sim.pending = null;
          sim.cooldown = rnd(5, 9);
        }
      }
    }
    writeSim(sim);
    return true;
  }

  // 3) maybe start a new event (one at a time + cooldown)
  if (sim.cooldown <= 0) {
    const running = machines.filter((m) => m.status === "Running");
    const roll = Math.random();
    if (running.length > 0 && roll < 0.05) {
      // sudden fault → Alarm (+ real alarm record)
      const m = running[rnd(0, running.length - 1)];
      const [desc, cause] = FAULTS[rnd(0, FAULTS.length - 1)];
      touch(m, { status: "Alarm", load_pct: rnd(5, 15) });
      try {
        createAlarm({
          machine_id: m.id,
          machine_name: m.name,
          alarm_code: nextAlarmCode(),
          description: `${desc} (sim)`,
          occurred_at: stampNow(),
          cause,
          status: "Open",
        });
      } catch {
        /* duplicate code — visual state already updated */
      }
      void logActivity("alarm.report", `${m.machine_id} ${desc}`);
      sim.pending = { id: m.id, stage: "alarm-hold", left: rnd(3, 5) };
      sim.cooldown = rnd(5, 9);
      writeSim(sim);
      return true;
    }
    if (running.length > 0 && roll < 0.075) {
      // sudden stop on its own
      const m = running[rnd(0, running.length - 1)];
      touch(m, { status: "Stop", load_pct: 0 });
      void logActivity("alarm.status", `${m.machine_id} → Stop`);
      sim.cooldown = rnd(5, 9);
      writeSim(sim);
      return true;
    }
    // stopped machines may come back by themselves
    const stopped = machines.filter((m) => m.status === "Stop");
    if (stopped.length > 0 && Math.random() < 0.3) {
      const m = stopped[rnd(0, stopped.length - 1)];
      touch(m, { status: "Running", load_pct: rnd(55, 75) });
      void logActivity("alarm.status", `${m.machine_id} → Running`);
      sim.cooldown = rnd(4, 7);
      writeSim(sim);
      return true;
    }
  }

  writeSim(sim);
  return changed;
}

/* ---------------- LIVE flag + reset (shared) ---------------- */
export function isSimLive(): boolean {
  try {
    return localStorage.getItem(LIVE_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setSimLive(on: boolean) {
  try {
    localStorage.setItem(LIVE_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}
/** Restore machines to seed + clear pending sim event (alarms/activity stay — delete manually). */
export function resetSimulation() {
  try {
    localStorage.setItem(M_KEY, JSON.stringify(seedMachines));
    localStorage.removeItem(SIM_KEY);
  } catch {
    /* ignore */
  }
}

/** Run the tick loop while `active`. Calls `refresh` after every tick. */
export function useSimulatorTick(active: boolean, refresh: () => void) {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      try {
        tickSimulator();
      } catch {
        /* sim must never break the page */
      }
      refresh();
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
