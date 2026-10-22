import type { MissionDef, MissionId } from '../types';
import { recon } from './recon';
import { brokenAuth } from './brokenAuth';
import { dataLeak } from './dataLeak';

export const MISSIONS: MissionDef[] = [recon, brokenAuth, dataLeak];

export const MISSION_IDS: MissionId[] = MISSIONS.map((m) => m.id);

export function getMission(id: MissionId): MissionDef {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown mission: ${id}`);
  return m;
}

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === 'string' && (MISSION_IDS as string[]).includes(value);
}

export function nextMission(id: MissionId): MissionDef | undefined {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return MISSIONS[i + 1];
}
