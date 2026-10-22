import type { DefenseConfig, DefenseDef, DefenseTestResult } from './types';

export function initialDefenseConfig(def: DefenseDef): DefenseConfig {
  return Object.fromEntries(def.settings.map((s) => [s.id, s.initial]));
}

/** 不正な値が混ざっていたら初期値で補う（localStorage 復元時など） */
export function sanitizeDefenseConfig(def: DefenseDef, input: unknown): DefenseConfig {
  const base = initialDefenseConfig(def);
  if (!input || typeof input !== 'object') return base;
  const src = input as Record<string, unknown>;
  for (const s of def.settings) {
    const v = src[s.id];
    if (typeof v === 'string' && s.options.some((o) => o.value === v)) base[s.id] = v;
  }
  return base;
}

export interface DefenseRun {
  results: DefenseTestResult[];
  allPass: boolean;
  attackBlocked: number;
  attackTotal: number;
  legitOk: number;
  legitTotal: number;
}

export function runDefenseTests(def: DefenseDef, config: DefenseConfig): DefenseRun {
  const cfg = sanitizeDefenseConfig(def, config);
  const results = def.tests.map((t) => {
    const r = t.run(cfg);
    return { id: t.id, label: t.label, expected: t.expected, kind: t.kind, actual: r.actual, pass: r.pass };
  });
  const attacks = results.filter((r) => r.kind === 'attack');
  const legit = results.filter((r) => r.kind === 'legit');
  return {
    results,
    allPass: results.every((r) => r.pass),
    attackBlocked: attacks.filter((r) => r.pass).length,
    attackTotal: attacks.length,
    legitOk: legit.filter((r) => r.pass).length,
    legitTotal: legit.length,
  };
}
