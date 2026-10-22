import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialDefenseConfig, runDefenseTests, sanitizeDefenseConfig } from './defense';
import { MISSIONS, getMission } from './missions';

test('どのミッションも初期設定（脆弱）では防御テストに失敗する', () => {
  for (const m of MISSIONS) {
    const run = runDefenseTests(m.defense, initialDefenseConfig(m.defense));
    assert.equal(run.allPass, false, m.id);
  }
});

test('MISSION 01：VPN限定＋デバッグOFF＋envページ無効で合格', () => {
  const d = getMission('recon').defense;
  assert.ok(runDefenseTests(d, { exposure: 'vpn', debug: 'off', env: 'off' }).allPass);
  const closed = runDefenseTests(d, { exposure: 'closed', debug: 'off', env: 'off' });
  assert.equal(closed.allPass, false, 'ポートを閉じすぎると業務テストが落ちる');
  assert.equal(closed.attackBlocked, closed.attackTotal);
});

test('MISSION 02：3つすべて直すと合格、1回ロックはやりすぎ', () => {
  const d = getMission('broken-auth').defense;
  assert.ok(runDefenseTests(d, { allowEmpty: 'false', attempts: 'five', storage: 'hash' }).allPass);
  assert.equal(runDefenseTests(d, { allowEmpty: 'false', attempts: 'one', storage: 'hash' }).allPass, false);
  assert.equal(runDefenseTests(d, { allowEmpty: 'false', attempts: 'five', storage: 'plaintext' }).allPass, false);
});

test('MISSION 03：所有者照合で合格、UUIDだけでは不合格', () => {
  const d = getMission('data-leak').defense;
  assert.ok(runDefenseTests(d, { authz: 'owner', idFormat: 'sequential', api: 'on' }).allPass);
  assert.ok(runDefenseTests(d, { authz: 'owner', idFormat: 'uuid', api: 'on' }).allPass);
  assert.equal(runDefenseTests(d, { authz: 'session', idFormat: 'uuid', api: 'on' }).allPass, false);
  assert.equal(runDefenseTests(d, { authz: 'owner', idFormat: 'uuid', api: 'off' }).allPass, false);
});

test('不正な設定値は初期値に戻される', () => {
  const d = getMission('recon').defense;
  const c = sanitizeDefenseConfig(d, { exposure: 'everyone', debug: 'off', extra: 'x' });
  assert.deepEqual(c, { exposure: 'public', debug: 'off', env: 'on' });
});
