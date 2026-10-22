// ===== XP・ランク・進行状況の保存 =====
import type {
  HistoryEntry,
  MissionDef,
  MissionId,
  MissionRecord,
  Progress,
  SessionState,
} from './types';
import { MISSIONS, getMission, isMissionId } from './missions';
import { sanitizeDefenseConfig } from './defense';

export const STORAGE_KEY = 'project-zero-day:v1';

export interface Rank {
  name: string;
  minXp: number;
  label: string;
}

export const RANKS: Rank[] = [
  { name: 'ROOKIE', minXp: 0, label: '見習い' },
  { name: 'CADET', minXp: 150, label: '訓練生' },
  { name: 'ANALYST', minXp: 350, label: '分析官' },
  { name: 'OPERATOR', minXp: 550, label: '実行部隊' },
  { name: 'ZERO DAY HUNTER', minXp: 650, label: '脆弱性ハンター' },
];

export const MAX_TOTAL_XP = MISSIONS.reduce((sum, m) => sum + m.baseXp + m.defenseXp, 0);

export function rankFor(xp: number): { rank: Rank; next?: Rank; ratio: number } {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.minXp) idx = i;
  });
  const rank = RANKS[idx];
  const next = RANKS[idx + 1];
  const ratio = next ? (xp - rank.minXp) / (next.minXp - rank.minXp) : 1;
  return { rank, next, ratio: Math.max(0, Math.min(1, ratio)) };
}

function emptyRecord(): MissionRecord {
  return { cleared: false, defenseCleared: false, missionXp: 0, defenseXp: 0, plays: 0 };
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    records: Object.fromEntries(MISSIONS.map((m) => [m.id, emptyRecord()])) as Record<MissionId, MissionRecord>,
    history: [],
    hintLog: [],
    sessions: {},
    defenseConfigs: {},
  };
}

/** ヒント1回ごとに20%減、ミス1回ごとに10XP減。最低でも基本XPの30% */
export function computeMissionXp(mission: MissionDef, hintsUsed: number, strikes: number): number {
  const raw = Math.round(mission.baseXp * (1 - 0.2 * hintsUsed)) - 10 * strikes;
  return Math.max(Math.round(mission.baseXp * 0.3), raw);
}

function totalXp(records: Record<MissionId, MissionRecord>): number {
  return Object.values(records).reduce((sum, r) => sum + r.missionXp + r.defenseXp, 0);
}

function pushHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, 30);
}

/**
 * ミッション終了（クリア or 失敗）を記録する。
 * XPは初回クリア時だけ付与し、繰り返しクリアでは増えない。
 */
export function recordMissionEnd(
  progress: Progress,
  session: SessionState,
  now: number = Date.now(),
): { progress: Progress; xpGained: number; firstClear: boolean } {
  const mission = getMission(session.missionId);
  const prev = progress.records[mission.id] ?? emptyRecord();
  const success = session.status === 'cleared';
  const firstClear = success && !prev.cleared;
  const xpGained = firstClear ? computeMissionXp(mission, session.hintsUsed, session.strikes) : 0;

  const record: MissionRecord = {
    ...prev,
    cleared: prev.cleared || success,
    missionXp: prev.missionXp + xpGained,
    plays: prev.plays + 1,
    lastPlayedAt: now,
    bestOps: success ? Math.min(prev.bestOps ?? Infinity, session.ops) : prev.bestOps,
  };
  const records = { ...progress.records, [mission.id]: record };
  return {
    progress: {
      ...progress,
      records,
      xp: totalXp(records),
      history: pushHistory(progress.history, {
        missionId: mission.id,
        kind: success ? (firstClear ? 'clear' : 'replay') : 'fail',
        xp: xpGained,
        at: now,
        ops: session.ops,
        hints: session.hintsUsed,
      }),
    },
    xpGained,
    firstClear,
  };
}

/** 防御テスト成功を記録する（追加XPは初回のみ） */
export function recordDefenseSuccess(
  progress: Progress,
  missionId: MissionId,
  now: number = Date.now(),
): { progress: Progress; xpGained: number } {
  const mission = getMission(missionId);
  const prev = progress.records[missionId] ?? emptyRecord();
  const xpGained = prev.defenseCleared ? 0 : mission.defenseXp;
  const records = {
    ...progress.records,
    [missionId]: { ...prev, defenseCleared: true, defenseXp: prev.defenseXp + xpGained },
  };
  return {
    progress: {
      ...progress,
      records,
      xp: totalXp(records),
      history: xpGained
        ? pushHistory(progress.history, { missionId, kind: 'defense', xp: xpGained, at: now })
        : progress.history,
    },
    xpGained,
  };
}

export function recordHint(progress: Progress, missionId: MissionId, level: number, now: number = Date.now()): Progress {
  return { ...progress, hintLog: [{ missionId, level, at: now }, ...progress.hintLog].slice(0, 100) };
}

// ---------- 保存と復元 ----------

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeSession(raw: unknown, id: MissionId): SessionState | undefined {
  if (!isObj(raw) || raw.missionId !== id) return undefined;
  const status = raw.status;
  if (status !== 'active' && status !== 'cleared' && status !== 'failed') return undefined;
  if (!Array.isArray(raw.lines) || !Array.isArray(raw.log) || !Array.isArray(raw.flags)) return undefined;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    missionId: id,
    status,
    lines: raw.lines.filter((l) => isObj(l) && typeof l.text === 'string').slice(-400) as SessionState['lines'],
    log: raw.log.filter((l) => isObj(l) && typeof l.message === 'string').slice(-120) as SessionState['log'],
    flags: raw.flags.filter((f): f is string => typeof f === 'string'),
    ops: num(raw.ops),
    hintsUsed: Math.min(3, num(raw.hintsUsed)),
    strikes: num(raw.strikes),
    history: Array.isArray(raw.history) ? raw.history.filter((h): h is string => typeof h === 'string').slice(-50) : [],
    vars: isObj(raw.vars)
      ? Object.fromEntries(Object.entries(raw.vars).filter((e): e is [string, string] => typeof e[1] === 'string'))
      : {},
    startedAt: num(raw.startedAt),
    endedAt: typeof raw.endedAt === 'number' ? raw.endedAt : undefined,
  };
}

/** 壊れたデータや古い形式でもアプリが落ちないように検証して復元する */
export function parseProgress(json: string | null): Progress {
  const base = emptyProgress();
  if (!json) return base;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return base;
  }
  if (!isObj(raw) || raw.version !== 1) return base;

  const records = { ...base.records };
  if (isObj(raw.records)) {
    for (const [id, r] of Object.entries(raw.records)) {
      if (!isMissionId(id) || !isObj(r)) continue;
      const m = getMission(id);
      records[id] = {
        cleared: r.cleared === true,
        defenseCleared: r.defenseCleared === true,
        missionXp: typeof r.missionXp === 'number' ? Math.max(0, Math.min(m.baseXp, r.missionXp)) : 0,
        defenseXp: typeof r.defenseXp === 'number' ? Math.max(0, Math.min(m.defenseXp, r.defenseXp)) : 0,
        plays: typeof r.plays === 'number' ? r.plays : 0,
        bestOps: typeof r.bestOps === 'number' ? r.bestOps : undefined,
        lastPlayedAt: typeof r.lastPlayedAt === 'number' ? r.lastPlayedAt : undefined,
      };
    }
  }

  const sessions: Progress['sessions'] = {};
  const defenseConfigs: Progress['defenseConfigs'] = {};
  for (const m of MISSIONS) {
    if (isObj(raw.sessions)) {
      const s = sanitizeSession(raw.sessions[m.id], m.id);
      if (s) sessions[m.id] = s;
    }
    if (isObj(raw.defenseConfigs) && raw.defenseConfigs[m.id]) {
      defenseConfigs[m.id] = sanitizeDefenseConfig(m.defense, raw.defenseConfigs[m.id]);
    }
  }

  const history = Array.isArray(raw.history)
    ? (raw.history.filter((h) => isObj(h) && isMissionId(h.missionId) && typeof h.at === 'number') as HistoryEntry[])
    : [];
  const hintLog = Array.isArray(raw.hintLog)
    ? (raw.hintLog.filter((h) => isObj(h) && isMissionId(h.missionId)) as Progress['hintLog'])
    : [];

  return { version: 1, xp: totalXp(records), records, history: history.slice(0, 30), hintLog, sessions, defenseConfigs };
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadProgress(storage: KeyValueStorage | undefined): Progress {
  try {
    return parseProgress(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return emptyProgress();
  }
}

/** 保存に成功したら true */
export function saveProgress(storage: KeyValueStorage | undefined, progress: Progress): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
