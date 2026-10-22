import type { MissionDef, Output, SessionState } from '../types';
import { line } from '../text';
import { CMD } from './common';

/** 架空のテストアカウント（実在しない） */
const ACCOUNTS: Record<string, { password: string; role: string }> = {
  't.tanaka': { password: 'zc-demo-pass', role: '一般社員' },
  admin: { password: 'Adm1n-zc-77', role: '管理者' },
};

const PASSWORD_PATTERN = /^[A-Za-z0-9!_.\-]{0,24}$/;
const USER_PATTERN = /^[a-z0-9._\-]{1,20}$/;

/** 脆弱なログイン判定（演習用に意図的にバグを入れている） */
export function vulnerableLogin(user: string, password: string): { ok: boolean; role?: string; reason: string } {
  const account = ACCOUNTS[user];
  if (!account) return { ok: false, reason: 'ユーザーが存在しません' };
  // allow_empty_password: true のため、空パスワードが素通りしてしまう
  if (password === '') return { ok: true, role: account.role, reason: '空パスワードを許可（allow_empty_password）' };
  if (password === account.password) return { ok: true, role: account.role, reason: 'パスワード一致' };
  return { ok: false, reason: 'パスワードが違います' };
}

function loginOutput(user: string, password: string): Output {
  const shown = password === '' ? '(空欄)' : '*'.repeat(password.length);
  const result = vulnerableLogin(user, password);
  const head = line(`POST /login  user=${user}  password=${shown}`, 'muted');
  if (!result.ok) {
    return { lines: [head, line(`401 ログイン失敗: ${result.reason}`, 'ok')] };
  }
  if (password === '') {
    return {
      lines: [
        head,
        line(`200 ログイン成功  role=${result.role}`, 'bad'),
        line('! パスワードを入力していないのにログインできました', 'bad'),
      ],
      flags: ['m2-anomaly'],
      events: [
        {
          level: 'alert',
          source: 'AUTH',
          message: `空パスワードで ${user}（${result.role}）としてログイン成功`,
        },
      ],
    };
  }
  return { lines: [head, line(`200 ログイン成功  role=${result.role}`, 'ok')] };
}

const TESTCASES: { id: string; label: string; user: string; password: string; expect: boolean }[] = [
  { id: 'tc-1', label: '正しいID + 正しいパスワード', user: 't.tanaka', password: 'zc-demo-pass', expect: true },
  { id: 'tc-2', label: '正しいID + 間違ったパスワード', user: 't.tanaka', password: 'wrong-pass', expect: false },
  { id: 'tc-3', label: '正しいID + 空のパスワード', user: 't.tanaka', password: '', expect: false },
  { id: 'tc-4', label: '存在しないID', user: 'nobody', password: 'anything', expect: false },
];

function testcase(args: string[], _session: SessionState): Output {
  const sub = (args[0] ?? '').toLowerCase();
  if (sub === 'list' || sub === '') {
    return {
      lines: [
        line('ID    内容                          期待する結果'),
        ...TESTCASES.map((t) =>
          line(`${t.id.toUpperCase()}  ${t.label.padEnd(18, '　')}  ${t.expect ? '成功' : '失敗'}`),
        ),
        line('実行: testcase run TC-1', 'muted'),
      ],
    };
  }
  if (sub === 'run') {
    const id = (args[1] ?? '').toLowerCase();
    const tc = TESTCASES.find((t) => t.id === id);
    if (!tc) return { lines: [line('テストケースIDが見つかりません。testcase list で確認してください', 'bad')] };
    const result = vulnerableLogin(tc.user, tc.password);
    const matched = result.ok === tc.expect;
    const out: Output = {
      lines: [
        line(`${tc.id.toUpperCase()}: ${tc.label}`, 'accent'),
        line(`期待: ${tc.expect ? '成功' : '失敗'}   実際: ${result.ok ? '成功' : '失敗'}（${result.reason}）`),
        matched ? line('PASS 期待どおり', 'ok') : line('FAIL 期待と違う動きをしています', 'bad'),
      ],
    };
    if (!matched) {
      out.flags = ['m2-anomaly'];
      out.events = [{ level: 'alert', source: 'TEST', message: `${tc.id.toUpperCase()} が FAIL：空パスワードでログインできる` }];
    }
    return out;
  }
  return { lines: [line('使い方: testcase list | testcase run <ID>', 'warn')] };
}

function login(args: string[], session: SessionState): Output {
  void session;
  const user = (args[0] ?? '').toLowerCase();
  const password = args[1] ?? '';
  if (!user) return { lines: [line('使い方: login <ユーザー> [パスワード]  ※パスワード省略＝空欄', 'warn')] };
  if (args.length > 2) return { lines: [line('引数が多すぎます', 'bad')] };
  if (!USER_PATTERN.test(user)) return { lines: [line('ユーザー名に使えない文字が含まれています', 'bad')] };
  if (!PASSWORD_PATTERN.test(password))
    return { lines: [line('パスワードは英数字と ! _ . - の24文字以内で入力してください', 'bad')] };
  return loginOutput(user, password);
}

export const brokenAuth: MissionDef = {
  id: 'broken-auth',
  code: 'MISSION 02',
  title: 'BROKEN AUTH',
  subtitle: '認証の不備',
  difficulty: '初級',
  baseXp: 150,
  defenseXp: 75,
  briefing:
    '社員ポータル ZERO PORTAL で「ログインした覚えのない履歴がある」と問い合わせが来た。ログイン判定のどこが壊れているのかを突き止めろ。',
  objective: '用意されたテストケースやログイン画面で挙動を確かめ、認証設定の中から原因となっている項目を submit で報告する。',
  focusNodes: ['internet', 'fw-01', 'auth-01'],
  targetNode: 'auth-01',
  alertFlag: 'm2-anomaly',
  targetView: 'login',
  commands: [
    CMD.help,
    CMD.status,
    CMD.testcase,
    CMD.login,
    CMD.inspect,
    CMD.logs,
    CMD.submit,
    CMD.history,
    CMD.clear,
  ],
  intro: [
    line('ZERO CORP 仮想演習環境に接続しました（すべて架空のデータです）', 'system'),
    line('MISSION 02: BROKEN AUTH — ZERO PORTAL の認証を検証せよ', 'accent'),
    line('テスト用アカウント: t.tanaka（パスワードは testcase で使用済み）', 'muted'),
  ],
  scan: {},
  inspect: {
    'auth-01': {
      lines: [
        line('[auth-01] 認証サーバー ZERO PORTAL'),
        line('確認できるリソース: auth-01:config（認証設定） / auth-01:login.js（判定処理）', 'muted'),
      ],
    },
    'auth-01:config': {
      lines: [
        line('# auth-01 認証設定'),
        line('allow_empty_password : true        # 開発中のテスト用', 'bad'),
        line('max_login_attempts   : unlimited', 'warn'),
        line('password_storage     : plaintext', 'warn'),
        line('session_timeout      : 30d'),
      ],
      flags: ['m2-config'],
      events: [{ level: 'warn', source: 'INSPECT', message: '認証設定に開発用の項目が残っている' }],
    },
    'auth-01:login.js': {
      lines: [
        line('function checkLogin(user, input) {'),
        line('  if (!user) return FAIL;'),
        line('  if (config.allow_empty_password && input === "") return OK;', 'bad'),
        line('  if (input === user.password) return OK;'),
        line('  return FAIL;'),
        line('}'),
        line('! 設定次第で、空欄の入力がパスワード照合より先に OK になります', 'bad'),
      ],
      flags: ['m2-code'],
    },
  },
  logs: {
    'auth-01': {
      lines: [
        line('時刻      送信元          ユーザー   パスワード  結果'),
        line('09:01:12  10.0.4.21       t.tanaka   入力あり    成功'),
        line('01:33:40  203.0.113.61    admin      空欄        成功', 'bad'),
        line('01:33:52  203.0.113.61    admin      (設定画面にアクセス)', 'bad'),
        line('01:40:05  203.0.113.61    t.tanaka   空欄        成功', 'bad'),
        line('! 深夜に社外IPから、パスワード空欄でのログイン成功が続いています', 'bad'),
      ],
      flags: ['m2-logs'],
      events: [{ level: 'alert', source: 'LOGS', message: '社外IPから空パスワードでのログイン成功履歴' }],
    },
  },
  custom: { testcase, login },
  cheatExamples: {
    testcase: ['testcase list', 'testcase run TC-1'],
    login: ['login t.tanaka zc-demo-pass'],
  },
  requiredFlags: [
    { id: 'm2-anomaly', label: '期待と違うログイン結果を再現する' },
    { id: 'm2-config', label: '認証設定を確認する' },
  ],
  answer: 'allow_empty_password',
  submitFeedback: {
    max_login_attempts:
      '回数制限なしも弱点ですが、「パスワードなしでログインできる」直接の原因ではありません。',
    password_storage: '平文保存も危険ですが、今回のログイン不具合の原因ではありません（防御ラボで直せます）。',
    session_timeout: 'セッションが長いのは別の問題です。ログイン判定そのものを見直してください。',
    'auth-01': '方向性は合っています。設定項目の名前で報告してください。',
    'auth-01:config': '惜しい。設定ファイルの中のどの項目が原因か、項目名で報告してください。',
    'auth-01:login.js': '判定処理は設定値に従っているだけです。原因になっている設定項目名で報告してください。',
  },
  hints: [
    '注目する場所：testcase list で用意されたテストを見て、1つずつ実行してみよう。「期待」と「実際」が食い違うものがあるはず。',
    '調査の考え方：おかしな動きを再現できたら、次は「なぜそうなるか」。inspect auth-01:config で認証の設定を見て、開発中の名残りを探そう。',
    '解答：testcase run TC-3 で空パスワードのログインが成功する。inspect auth-01:config に allow_empty_password: true がある。報告は submit allow_empty_password。',
  ],
  lesson: {
    what: 'パスワード欄を空にしたままでも、どのアカウントにもログインできてしまう状態でした。管理者アカウントも例外ではありませんでした。',
    why: '開発中にテストを楽にするための設定 allow_empty_password が、本番でも true のまま残っていました。判定処理はこの設定を最初に見るため、正しいパスワードの照合まで進まずに成功していました。',
    impact: 'IDさえ分かれば誰にでもなりすませます。管理者になりすまされると、設定変更や情報の持ち出しなど、被害がシステム全体に広がります。',
    fix: 'allow_empty_password を false にし、ログイン試行回数に上限を設けます。パスワードは平文ではなくハッシュ化して保存します。',
    practice: '開発用の設定は本番用の設定ファイルと分け、本番に出す前に自動チェックで検出する。「失敗すべきケース」（空欄・間違い・存在しないID）もテストに入れて、期待どおり失敗することを確認する。',
    glossary: [
      { term: '認証', desc: '「あなたが本人か」を確かめる仕組み。パスワードやワンタイムコードなど。' },
      { term: 'テストケース', desc: '入力と期待する結果の組み合わせ。成功ケースだけでなく失敗すべきケースも大切です。' },
      { term: 'ハッシュ化', desc: '元に戻せない形に変換して保存すること。漏れてもパスワードがそのまま読まれません。' },
      { term: '総当たり攻撃', desc: 'パスワードを何通りも試し続ける攻撃。回数制限で防ぎます。' },
    ],
  },
  defense: {
    intro: 'ZERO PORTAL の認証設定を見直しましょう。正しい利用者が困らないことも確認されます。',
    settings: [
      {
        id: 'allowEmpty',
        label: 'allow_empty_password',
        description: '空欄のパスワードを受け付けるか',
        initial: 'true',
        options: [
          { value: 'true', label: 'true（許可）', safety: 'vulnerable', note: 'IDだけでログインできる' },
          { value: 'false', label: 'false（拒否）', safety: 'safe', note: '必ずパスワード照合を行う' },
        ],
      },
      {
        id: 'attempts',
        label: 'max_login_attempts',
        description: '連続で失敗できる回数',
        initial: 'unlimited',
        options: [
          { value: 'unlimited', label: '無制限', safety: 'vulnerable', note: '総当たり攻撃を止められない' },
          { value: 'five', label: '5回で15分ロック', safety: 'safe', note: '打ち間違いは許し、総当たりは止める' },
          { value: 'one', label: '1回で永久ロック', safety: 'overkill', note: '打ち間違いで本人も締め出される' },
        ],
      },
      {
        id: 'storage',
        label: 'password_storage',
        description: 'パスワードの保存方法',
        initial: 'plaintext',
        options: [
          { value: 'plaintext', label: '平文', safety: 'vulnerable', note: 'DBが漏れると全員のパスワードが読める' },
          { value: 'hash', label: 'ハッシュ化（bcrypt）', safety: 'safe', note: '漏れても元のパスワードは分からない' },
        ],
      },
    ],
    tests: [
      {
        id: 'legit-login',
        label: '正しいパスワードでログイン',
        expected: '成功',
        kind: 'legit',
        run: () => ({ pass: true, actual: '成功' }),
      },
      {
        id: 'typo-then-login',
        label: '1回打ち間違えてから正しく入力',
        expected: '成功',
        kind: 'legit',
        run: (c) =>
          c.attempts === 'one'
            ? { pass: false, actual: 'ロックされて本人が使えない' }
            : { pass: true, actual: '成功' },
      },
      {
        id: 'empty-password',
        label: '空パスワードでログイン',
        expected: '拒否',
        kind: 'attack',
        run: (c) =>
          c.allowEmpty === 'true' ? { pass: false, actual: 'ログインできてしまった' } : { pass: true, actual: '拒否' },
      },
      {
        id: 'bruteforce',
        label: 'パスワードを100回試す',
        expected: '途中でロック',
        kind: 'attack',
        run: (c) =>
          c.attempts === 'unlimited'
            ? { pass: false, actual: '100回すべて試せた' }
            : { pass: true, actual: c.attempts === 'five' ? '5回目でロック' : '1回目でロック' },
      },
      {
        id: 'db-leak',
        label: 'パスワード表が漏れた想定',
        expected: '中身を読めない',
        kind: 'attack',
        run: (c) =>
          c.storage === 'plaintext'
            ? { pass: false, actual: 'パスワードがそのまま読めた' }
            : { pass: true, actual: 'ハッシュ値のみ' },
      },
    ],
    successNote: '空欄を拒否する（入口の判定）、回数を制限する（総当たり対策）、ハッシュ化する（漏えい時の被害軽減）。それぞれ別の攻撃を止める対策で、どれか1つでは足りません。',
  },
};
