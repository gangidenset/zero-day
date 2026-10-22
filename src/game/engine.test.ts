import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, runCommand, applyHint, parseInput, looksExternal, MAX_STRIKES } from './engine';
import { getMission } from './missions';
import type { SessionState } from './types';

const play = (id: Parameters<typeof getMission>[0], cmds: string[]): SessionState => {
  const m = getMission(id);
  return cmds.reduce((s, c) => runCommand(m, s, c, 1000), createSession(m, 0));
};
const text = (s: SessionState) => s.lines.map((l) => l.text).join('\n');

test('入力検証：全角・シェル記号・長すぎる入力を拒否する', () => {
  assert.equal(parseInput('ｓｃａｎ').ok, false);
  assert.equal(parseInput('scan web-01; rm -rf /').ok, false);
  assert.equal(parseInput('a'.repeat(101)).ok, false);
  const p = parseInput('  SCAN   web-01 ');
  assert.ok(p.ok && p.command === 'scan' && p.args[0] === 'web-01');
});

test('外部IP・URLは調査できない', () => {
  assert.ok(looksExternal('8.8.8.8'));
  assert.ok(looksExternal('https://example.com'));
  assert.ok(looksExternal('example.com'));
  assert.ok(!looksExternal('web-01:8080'));
  const s = play('recon', ['scan 8.8.8.8', 'scan example.com']);
  assert.match(text(s), /外部のIPアドレスやURLは調査できません/);
  assert.equal(s.flags.length, 0);
});

test('許可リストにないコマンドは実行されない', () => {
  const s = play('recon', ['rm -rf /', 'request /api/me', 'nmap web-01']);
  assert.equal(s.flags.length, 0);
  assert.match(text(s), /このミッションでは使えないコマンド/);
});

test('MISSION 01：コマンド名だけではクリアできない', () => {
  const s = play('recon', ['help', 'status', 'scan', 'inspect', 'logs', 'submit web-01:8080']);
  assert.equal(s.status, 'active');
  assert.equal(s.strikes, 0, '証拠不足の報告はミスに数えない');
});

test('MISSION 01：証拠を集めて正しく報告するとクリア', () => {
  const s = play('recon', ['scan web-01', 'inspect web-01:8080', 'logs web-01', 'submit web-01:8080']);
  assert.equal(s.status, 'cleared');
  assert.deepEqual([...s.flags].sort(), ['m1-debug', 'm1-logs', 'm1-port']);
  assert.equal(s.ops, 4);
});

test('MISSION 01：3回まちがえると失敗', () => {
  const s = play('recon', [
    'scan web-01', 'inspect web-01:8080', 'logs web-01',
    'submit web-01:443', 'submit db-01', 'submit fw-01',
  ]);
  assert.equal(s.strikes, MAX_STRIKES);
  assert.equal(s.status, 'failed');
  const after = runCommand(getMission('recon'), s, 'submit web-01:8080');
  assert.equal(after.status, 'failed', '失敗後に正解しても覆らない');
});

test('MISSION 02：空パスワードの再現と設定確認でクリア', () => {
  const s = play('broken-auth', ['testcase run tc-3', 'inspect auth-01:config', 'submit allow_empty_password']);
  assert.equal(s.status, 'cleared');
});

test('MISSION 02：正しいテストケースだけでは異常を発見できない', () => {
  const s = play('broken-auth', ['testcase run tc-1', 'testcase run tc-2', 'login t.tanaka zc-demo-pass']);
  assert.ok(!s.flags.includes('m2-anomaly'));
  const s2 = play('broken-auth', ['login admin']);
  assert.ok(s2.flags.includes('m2-anomaly'), 'ログイン画面で空パスワードを試しても発見できる');
});

test('MISSION 03：他人の請求書を取得するとIDORを発見', () => {
  const s = play('data-leak', ['request /api/invoices/1001']);
  assert.ok(!s.flags.includes('m3-idor'), '自分の請求書では発見にならない');
  const s2 = play('data-leak', [
    'request /api/invoices', 'request /api/invoices/1003', 'inspect api-01:invoice-handler', 'submit api-01:invoice-handler',
  ]);
  assert.equal(s2.status, 'cleared');
});

test('MISSION 03：user-b に切り替えると 1003 は自分のデータ扱い', () => {
  const s = play('data-leak', ['login user-b', 'request /api/invoices/1003']);
  assert.equal(s.vars.user, 'user-b');
  assert.ok(!s.flags.includes('m3-idor'));
  const s2 = play('data-leak', ['request http://evil.example/x']);
  assert.match(text(s2), /外部URLには送れません/);
});

test('ヒントは3段階までしか進まない', () => {
  const m = getMission('recon');
  let s = createSession(m, 0);
  for (let i = 0; i < 5; i++) s = applyHint(m, s);
  assert.equal(s.hintsUsed, 3);
});

test('clear で表示が消え、元のセッションは変更されない', () => {
  const m = getMission('recon');
  const s0 = createSession(m, 0);
  const s1 = runCommand(m, s0, 'clear');
  assert.equal(s1.lines.length, 0);
  assert.ok(s0.lines.length > 0);
});
