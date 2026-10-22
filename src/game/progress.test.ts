import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, runCommand, applyHint } from './engine';
import { getMission } from './missions';
import {
  computeMissionXp, emptyProgress, parseProgress, rankFor, recordDefenseSuccess, recordMissionEnd,
  loadProgress, saveProgress, STORAGE_KEY, MAX_TOTAL_XP,
} from './progress';

const clearRecon = (hints = 0) => {
  const m = getMission('recon');
  let s = createSession(m, 0);
  for (let i = 0; i < hints; i++) s = applyHint(m, s);
  for (const c of ['scan web-01', 'inspect web-01:8080', 'logs web-01', 'submit web-01:8080']) s = runCommand(m, s, c);
  return s;
};

test('初期ランクは ROOKIE', () => {
  assert.equal(rankFor(0).rank.name, 'ROOKIE');
  assert.equal(rankFor(150).rank.name, 'CADET');
  assert.equal(rankFor(MAX_TOTAL_XP).rank.name, 'ZERO DAY HUNTER');
});

test('ヒントとミスでXPが減り、下限は30%', () => {
  const m = getMission('recon');
  assert.equal(computeMissionXp(m, 0, 0), 100);
  assert.equal(computeMissionXp(m, 1, 0), 80);
  assert.equal(computeMissionXp(m, 3, 2), 30);
});

test('同じミッションを何度クリアしてもXPは1回分だけ', () => {
  let p = emptyProgress();
  const r1 = recordMissionEnd(p, clearRecon());
  p = r1.progress;
  assert.equal(r1.xpGained, 100);
  assert.ok(r1.firstClear);
  const r2 = recordMissionEnd(p, clearRecon());
  assert.equal(r2.xpGained, 0);
  assert.equal(r2.progress.xp, 100);
  assert.equal(r2.progress.records.recon.plays, 2);
});

test('防御ボーナスも1回だけ', () => {
  let p = emptyProgress();
  const a = recordDefenseSuccess(p, 'recon');
  p = a.progress;
  const b = recordDefenseSuccess(p, 'recon');
  assert.equal(a.xpGained, 50);
  assert.equal(b.xpGained, 0);
  assert.equal(b.progress.xp, 50);
});

test('保存した進捗を復元でき、壊れたデータでは初期状態になる', () => {
  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
  const p = recordMissionEnd(emptyProgress(), clearRecon(1)).progress;
  assert.ok(saveProgress(storage, p));
  const loaded = loadProgress(storage);
  assert.equal(loaded.xp, 80);
  assert.ok(loaded.records.recon.cleared);
  mem.set(STORAGE_KEY, '{broken');
  assert.equal(loadProgress(storage).xp, 0);
  assert.equal(parseProgress(JSON.stringify({ version: 1, records: { recon: { missionXp: 99999, cleared: true } } })).xp, 100, 'XPは上限で切り詰める');
});
