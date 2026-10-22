// ===== コマンド処理エンジン（UIから独立した純粋関数） =====
// 安全設計：
// - コマンドはミッションごとの許可リストに載っているものだけを受け付ける
// - scan / inspect / logs / submit の引数は、ミッションに定義された固定リソース名だけ
// - 実際のネットワーク通信・OSコマンド・コード評価は一切行わない

import type { CommandName, LogEvent, MissionDef, Output, SessionState, TermLine } from './types';
import { line } from './text';

export const MAX_INPUT_LENGTH = 100;
export const MAX_STRIKES = 3;
const MAX_LINES = 400;
const MAX_LOG = 120;

/** 表示可能なASCII文字のみ許可（制御文字・全角は拒否） */
const SAFE_INPUT = /^[\x20-\x7E]*$/;
/** リソース名として許可する文字 */
const RESOURCE_PATTERN = /^[a-z0-9_.:\-/]{1,40}$/;
const IP_LIKE = /^\d{1,3}(\.\d{1,3}){3}/;
const URL_LIKE = /:\/\/|^www\.|\.(com|net|org|jp|io|dev)(\b|\/|:)/;

export function createSession(mission: MissionDef, now: number = Date.now()): SessionState {
  return {
    missionId: mission.id,
    status: 'active',
    lines: [...mission.intro],
    log: [{ step: 0, level: 'info', source: 'SYSTEM', message: `${mission.code} ${mission.title} 開始（仮想演習環境）` }],
    flags: [],
    ops: 0,
    hintsUsed: 0,
    strikes: 0,
    history: [],
    vars: {},
    startedAt: now,
  };
}

export type ParseResult =
  | { ok: true; command: string; args: string[] }
  | { ok: false; error: string };

/** 入力を検証して分解する */
export function parseInput(raw: string): ParseResult {
  const input = raw.trim();
  if (input.length === 0) return { ok: false, error: '' };
  if (input.length > MAX_INPUT_LENGTH) {
    return { ok: false, error: `入力が長すぎます（${MAX_INPUT_LENGTH}文字まで）` };
  }
  if (!SAFE_INPUT.test(input)) {
    return { ok: false, error: '半角英数字と記号で入力してください（全角文字・制御文字は使えません）' };
  }
  if (/[;&|`$<>]/.test(input)) {
    return { ok: false, error: 'シェル用の記号（; & | ` $ < >）は使えません。これは仮想ターミナルです' };
  }
  const parts = input.split(/\s+/);
  const command = parts[0].toLowerCase();
  return { ok: true, command, args: parts.slice(1) };
}

/** 引数が外部の対象を指していないかを判定 */
export function looksExternal(target: string): boolean {
  return IP_LIKE.test(target) || URL_LIKE.test(target);
}

function err(text: string): Output {
  return { lines: [line(text, 'bad')] };
}

function lookup(table: Record<string, Output>, args: string[], verb: string): Output {
  if (args.length !== 1) {
    const names = Object.keys(table);
    return {
      lines: [
        line(`使い方: ${verb} <対象>`, 'warn'),
        ...(names.length ? [line(`この演習の対象: ${names.join(', ')}`, 'muted')] : []),
      ],
    };
  }
  const target = args[0].toLowerCase();
  if (looksExternal(target)) {
    return err('外部のIPアドレスやURLは調査できません。対象は ZERO CORP 仮想環境のリソースだけです');
  }
  if (!RESOURCE_PATTERN.test(target)) return err('対象名に使えない文字が含まれています');
  const out = table[target];
  if (!out) {
    const names = Object.keys(table);
    return {
      lines: [
        line(`${target}: この演習では ${verb} できない対象です`, 'warn'),
        ...(names.length ? [line(`候補: ${names.join(', ')}`, 'muted')] : []),
      ],
    };
  }
  return out;
}

function helpOutput(mission: MissionDef): Output {
  return {
    lines: [
      line('使えるコマンド（このミッション用）', 'accent'),
      ...mission.commands.map((c) => line(`  ${c.usage.padEnd(30)} ${c.description}`)),
      line('↑↓キーで入力履歴を呼び出せます', 'muted'),
    ],
  };
}

function statusOutput(mission: MissionDef, s: SessionState): Output {
  const found = mission.requiredFlags.filter((f) => s.flags.includes(f.id)).length;
  return {
    lines: [
      line(`ENV     ZERO CORP 仮想演習環境（外部への通信なし）`, 'system'),
      line(`MISSION ${mission.code} ${mission.title} — ${mission.subtitle}`),
      line(`STATUS  ${s.status === 'active' ? '調査中' : s.status === 'cleared' ? 'クリア' : '失敗'}`),
      line(`EVIDENCE ${found}/${mission.requiredFlags.length}   OPS ${s.ops}   HINTS ${s.hintsUsed}/3   MISS ${s.strikes}/${MAX_STRIKES}`),
      ...mission.requiredFlags.map((f) =>
        line(`  [${s.flags.includes(f.id) ? 'x' : ' '}] ${f.label}`, s.flags.includes(f.id) ? 'ok' : 'muted'),
      ),
    ],
  };
}

function historyOutput(s: SessionState): Output {
  if (s.history.length === 0) return { lines: [line('履歴はまだありません', 'muted')] };
  return {
    lines: s.history.slice(-15).map((h, i, arr) => line(`${String(s.history.length - arr.length + i + 1).padStart(3)}  ${h}`, 'muted')),
  };
}

export function missingFlags(mission: MissionDef, s: SessionState) {
  return mission.requiredFlags.filter((f) => !s.flags.includes(f.id));
}

interface SubmitOutcome {
  output: Output;
  result: 'correct' | 'wrong' | 'insufficient' | 'invalid' | 'done';
}

function submit(mission: MissionDef, s: SessionState, args: string[]): SubmitOutcome {
  if (s.status !== 'active') {
    return { output: { lines: [line('このミッションはすでに終了しています。リセットで再挑戦できます', 'warn')] }, result: 'done' };
  }
  if (args.length !== 1) {
    return { output: { lines: [line('使い方: submit <原因となるリソース名や設定名>', 'warn')] }, result: 'invalid' };
  }
  const target = args[0].toLowerCase();
  if (!RESOURCE_PATTERN.test(target)) {
    return { output: err('報告内容に使えない文字が含まれています'), result: 'invalid' };
  }
  const missing = missingFlags(mission, s);
  if (missing.length > 0) {
    return {
      output: {
        lines: [
          line('報告するには証拠が足りません（ミス回数にはカウントされません）', 'warn'),
          ...missing.map((f) => line(`  未確認: ${f.label}`, 'muted')),
        ],
      },
      result: 'insufficient',
    };
  }
  if (target === mission.answer) {
    return {
      output: {
        lines: [
          line(`REPORT ACCEPTED: ${target}`, 'ok'),
          line('弱点を特定しました。ミッションクリア！', 'ok'),
        ],
        events: [{ level: 'success', source: 'REPORT', message: `原因 ${target} の報告が承認された` }],
      },
      result: 'correct',
    };
  }
  const known = mission.submitFeedback[target];
  const remaining = MAX_STRIKES - (s.strikes + 1);
  return {
    output: {
      lines: [
        line(`REPORT REJECTED: ${target}`, 'bad'),
        line(known ?? 'その対象は今回の原因ではありません。集めた証拠を見直しましょう。', 'warn'),
        line(remaining > 0 ? `あと ${remaining} 回まちがえるとミッション失敗です` : 'ミス回数の上限に達しました', remaining > 0 ? 'muted' : 'bad'),
      ],
      events: [{ level: 'warn', source: 'REPORT', message: `報告 ${target} は却下された` }],
    },
    result: 'wrong',
  };
}

function appendLines(existing: TermLine[], add: TermLine[]): TermLine[] {
  const merged = [...existing, ...add];
  return merged.length > MAX_LINES ? merged.slice(merged.length - MAX_LINES) : merged;
}

function appendLog(existing: LogEvent[], add: LogEvent[]): LogEvent[] {
  const merged = [...existing, ...add];
  return merged.length > MAX_LOG ? merged.slice(merged.length - MAX_LOG) : merged;
}

/**
 * コマンドを1つ実行し、新しいセッション状態を返す（元の状態は変更しない）。
 */
export function runCommand(mission: MissionDef, session: SessionState, raw: string, now: number = Date.now()): SessionState {
  const parsed = parseInput(raw);
  if (!parsed.ok && parsed.error === '') return session;

  const echo = line(`zero@lab:~$ ${raw.trim().slice(0, MAX_INPUT_LENGTH)}`, 'input');
  const ops = session.ops + 1;
  const history = [...session.history, raw.trim().slice(0, MAX_INPUT_LENGTH)].slice(-50);

  if (!parsed.ok) {
    return { ...session, ops, history, lines: appendLines(session.lines, [echo, line(parsed.error, 'bad')]) };
  }

  const { command, args } = parsed;
  const allowed = mission.commands.some((c) => c.name === command);
  if (!allowed) {
    return {
      ...session,
      ops,
      history,
      lines: appendLines(session.lines, [
        echo,
        line(`${command}: このミッションでは使えないコマンドです。help で一覧を確認できます`, 'bad'),
      ]),
    };
  }

  const name = command as CommandName;

  if (name === 'clear') {
    return { ...session, ops, history, lines: [] };
  }

  let output: Output;
  let submitResult: SubmitOutcome['result'] | undefined;

  switch (name) {
    case 'help':
      output = helpOutput(mission);
      break;
    case 'status':
      output = statusOutput(mission, session);
      break;
    case 'history':
      output = historyOutput({ ...session, history });
      break;
    case 'scan':
      output = lookup(mission.scan, args, 'scan');
      break;
    case 'inspect':
      output = lookup(mission.inspect, args, 'inspect');
      break;
    case 'logs':
      output = lookup(mission.logs, args, 'logs');
      break;
    case 'submit': {
      const r = submit(mission, session, args);
      output = r.output;
      submitResult = r.result;
      break;
    }
    default: {
      const handler = mission.custom[name];
      output = handler ? handler(args, session) : err(`${name}: 実装されていません`);
    }
  }

  // 発見フラグの処理
  const newFlags = (output.flags ?? []).filter((f) => !session.flags.includes(f));
  const flags = [...session.flags, ...newFlags];
  const flagEvents: LogEvent[] = newFlags
    .map((id) => mission.requiredFlags.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .map((f) => ({ step: ops, level: 'success', source: 'EVIDENCE', message: `証拠を確保: ${f.label}` }));

  const outLines = [...output.lines];
  if (newFlags.some((id) => mission.requiredFlags.some((f) => f.id === id))) {
    const found = mission.requiredFlags.filter((f) => flags.includes(f.id)).length;
    outLines.push(line(`[+] 証拠を確保 (${found}/${mission.requiredFlags.length})`, 'accent'));
    if (found === mission.requiredFlags.length && session.status === 'active') {
      outLines.push(line('証拠がそろった。原因を submit で報告しよう', 'accent'));
    }
  }

  let status = session.status;
  let strikes = session.strikes;
  let endedAt = session.endedAt;
  if (submitResult === 'correct') {
    status = 'cleared';
    endedAt = now;
  } else if (submitResult === 'wrong') {
    strikes += 1;
    if (strikes >= MAX_STRIKES) {
      status = 'failed';
      endedAt = now;
      outLines.push(line('MISSION FAILED — リセットして再挑戦しよう', 'bad'));
    }
  }

  const events: LogEvent[] = [
    ...(output.events ?? []).map((e) => ({ ...e, step: ops })),
    ...flagEvents,
  ];
  if (status === 'failed' && session.status !== 'failed') {
    events.push({ step: ops, level: 'alert', source: 'SYSTEM', message: 'ミス回数の上限に達し、ミッション失敗' });
  }

  return {
    ...session,
    ops,
    history,
    flags,
    status,
    strikes,
    endedAt,
    vars: output.vars ? { ...session.vars, ...output.vars } : session.vars,
    lines: appendLines(session.lines, [echo, ...outLines]),
    log: appendLog(session.log, events),
  };
}

/** ヒントを1段階進める。3段階を超えては進まない */
export function applyHint(mission: MissionDef, session: SessionState): SessionState {
  if (session.hintsUsed >= mission.hints.length) return session;
  const level = session.hintsUsed + 1;
  return {
    ...session,
    hintsUsed: level,
    log: appendLog(session.log, [
      { step: session.ops, level: 'info', source: 'HINT', message: `ヒント ${level} を表示` },
    ]),
  };
}

export function progressRatio(mission: MissionDef, session: SessionState): number {
  if (session.status === 'cleared') return 1;
  const found = mission.requiredFlags.filter((f) => session.flags.includes(f.id)).length;
  // 証拠集めで90%、報告で100%
  return (found / mission.requiredFlags.length) * 0.9;
}
