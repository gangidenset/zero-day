import { useCallback, useEffect, useRef, useState } from 'react';
import type { DefenseConfig, MissionId, Progress, SessionState } from '../game/types';
import { getMission } from '../game/missions';
import { haptic } from '../pwa';
import { applyHint, createSession, runCommand } from '../game/engine';
import { initialDefenseConfig, runDefenseTests, type DefenseRun } from '../game/defense';
import {
  emptyProgress,
  loadProgress,
  recordDefenseSuccess,
  recordHint,
  recordMissionEnd,
  saveProgress,
  STORAGE_KEY,
  type KeyValueStorage,
} from '../game/progress';

export interface MissionOutcome {
  missionId: MissionId;
  success: boolean;
  xpGained: number;
  firstClear: boolean;
}

export interface DefenseOutcome {
  missionId: MissionId;
  run: DefenseRun;
  xpGained: number;
}

function getStorage(): KeyValueStorage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

/** ゲーム全体の状態と操作をまとめたフック */
export function useGame() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(getStorage()));
  const [outcomes, setOutcomes] = useState<Partial<Record<MissionId, MissionOutcome>>>({});
  const [defenseOutcomes, setDefenseOutcomes] = useState<Partial<Record<MissionId, DefenseOutcome>>>({});
  const [saveError, setSaveError] = useState(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    setSaveError(!saveProgress(getStorage(), progress));
  }, [progress]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((p) => fn(p));
  }, []);

  /** ミッションを開始（途中のセッションがあれば再開） */
  const startMission = useCallback(
    (id: MissionId): SessionState => {
      const existing = progressRef.current.sessions[id];
      if (existing) return existing;
      const session = createSession(getMission(id));
      update((p) => ({ ...p, sessions: { ...p.sessions, [id]: session } }));
      return session;
    },
    [update],
  );

  const execute = useCallback(
    (id: MissionId, input: string) => {
      const mission = getMission(id);
      const current = progressRef.current.sessions[id] ?? createSession(mission);
      const next = runCommand(mission, current, input);
      // 証拠発見・クリア・失敗を振動で知らせる（対応端末のみ）
      if (next.status === 'cleared' && current.status === 'active') haptic([40, 60, 40, 60, 120]);
      else if (next.status === 'failed' && current.status === 'active') haptic([200]);
      else if (next.flags.length > current.flags.length) haptic(30);
      let p: Progress = { ...progressRef.current, sessions: { ...progressRef.current.sessions, [id]: next } };
      if (current.status === 'active' && next.status !== 'active') {
        const r = recordMissionEnd(p, next);
        p = r.progress;
        setOutcomes((o) => ({
          ...o,
          [id]: { missionId: id, success: next.status === 'cleared', xpGained: r.xpGained, firstClear: r.firstClear },
        }));
      }
      progressRef.current = p;
      setProgress(p);
    },
    [],
  );

  const showHint = useCallback((id: MissionId) => {
    const mission = getMission(id);
    const current = progressRef.current.sessions[id] ?? createSession(mission);
    if (current.hintsUsed >= 3) return;
    const next = applyHint(mission, current);
    const p = recordHint({ ...progressRef.current, sessions: { ...progressRef.current.sessions, [id]: next } }, id, next.hintsUsed);
    progressRef.current = p;
    setProgress(p);
  }, []);

  const resetMission = useCallback((id: MissionId) => {
    const session = createSession(getMission(id));
    setOutcomes((o) => ({ ...o, [id]: undefined }));
    const p = { ...progressRef.current, sessions: { ...progressRef.current.sessions, [id]: session } };
    progressRef.current = p;
    setProgress(p);
  }, []);

  const defenseConfig = useCallback(
    (id: MissionId): DefenseConfig => progress.defenseConfigs[id] ?? initialDefenseConfig(getMission(id).defense),
    [progress.defenseConfigs],
  );

  const setDefenseValue = useCallback(
    (id: MissionId, settingId: string, value: string) => {
      setDefenseOutcomes((o) => ({ ...o, [id]: undefined }));
      update((p) => {
        const base = p.defenseConfigs[id] ?? initialDefenseConfig(getMission(id).defense);
        return { ...p, defenseConfigs: { ...p.defenseConfigs, [id]: { ...base, [settingId]: value } } };
      });
    },
    [update],
  );

  const resetDefense = useCallback(
    (id: MissionId) => {
      setDefenseOutcomes((o) => ({ ...o, [id]: undefined }));
      update((p) => ({ ...p, defenseConfigs: { ...p.defenseConfigs, [id]: initialDefenseConfig(getMission(id).defense) } }));
    },
    [update],
  );

  const retest = useCallback((id: MissionId) => {
    const mission = getMission(id);
    const config = progressRef.current.defenseConfigs[id] ?? initialDefenseConfig(mission.defense);
    const run = runDefenseTests(mission.defense, config);
    let xpGained = 0;
    if (run.allPass && progressRef.current.records[id].cleared) {
      const r = recordDefenseSuccess(progressRef.current, id);
      xpGained = r.xpGained;
      progressRef.current = r.progress;
      setProgress(r.progress);
    }
    setDefenseOutcomes((o) => ({ ...o, [id]: { missionId: id, run, xpGained } }));
  }, []);

  const resetAll = useCallback(() => {
    try {
      getStorage()?.removeItem(STORAGE_KEY);
    } catch {
      /* 保存領域が使えなくても初期化は続ける */
    }
    const p = emptyProgress();
    progressRef.current = p;
    setOutcomes({});
    setDefenseOutcomes({});
    setProgress(p);
  }, []);

  return {
    progress,
    outcomes,
    defenseOutcomes,
    saveError,
    startMission,
    execute,
    showHint,
    resetMission,
    defenseConfig,
    setDefenseValue,
    resetDefense,
    retest,
    resetAll,
  };
}

export type Game = ReturnType<typeof useGame>;
