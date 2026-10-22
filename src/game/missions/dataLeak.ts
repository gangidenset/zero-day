import type { MissionDef, Output, SessionState } from '../types';
import { line } from '../text';
import { CMD } from './common';

/** 架空の利用者と請求書データ（すべて演習用） */
export const DEMO_USERS: Record<string, { name: string; company: string }> = {
  'user-a': { name: '佐藤 ミナ', company: '架空商事株式会社' },
  'user-b': { name: '鈴木 ケン', company: '架空工業株式会社' },
};

export interface DemoInvoice {
  id: number;
  owner: 'user-a' | 'user-b';
  title: string;
  amount: number;
}

export const DEMO_INVOICES: DemoInvoice[] = [
  { id: 1001, owner: 'user-a', title: '10月分 クラウド利用料', amount: 48000 },
  { id: 1002, owner: 'user-a', title: 'サポート年間契約', amount: 120000 },
  { id: 1003, owner: 'user-b', title: '工場ネットワーク保守', amount: 350000 },
  { id: 1004, owner: 'user-b', title: '新規拠点 回線工事', amount: 820000 },
];

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

const PATH_PATTERN = /^\/api\/(me|invoices)(\/(\d{1,6}))?$/;

function currentUser(session: SessionState): string {
  return session.vars.user ?? 'user-a';
}

function whoami(_args: string[], session: SessionState): Output {
  const u = currentUser(session);
  const info = DEMO_USERS[u];
  return { lines: [line(`${u}  ${info.name}（${info.company}）`, 'accent')] };
}

function login(args: string[], _session: SessionState): Output {
  const u = (args[0] ?? '').toLowerCase();
  if (!(u in DEMO_USERS)) {
    return { lines: [line('この演習で使えるのは user-a / user-b のテストアカウントだけです', 'warn')] };
  }
  return {
    lines: [line(`${u} に切り替えました（演習用テストアカウント）`, 'ok')],
    vars: { user: u },
    events: [{ level: 'info', source: 'AUTH', message: `${u} でログイン` }],
  };
}

/** 脆弱な請求書API：所有者を確認せずにIDだけで返してしまう */
export function vulnerableGetInvoice(_user: string, id: number): DemoInvoice | undefined {
  return DEMO_INVOICES.find((inv) => inv.id === id);
}

function request(args: string[], session: SessionState): Output {
  const raw = args[0] ?? '';
  if (args.length !== 1) return { lines: [line('使い方: request /api/invoices  または  request /api/invoices/<ID>', 'warn')] };
  const m = PATH_PATTERN.exec(raw);
  if (!m) {
    return {
      lines: [line('このAPIで使えるパスは /api/me と /api/invoices[/ID] だけです（外部URLには送れません）', 'bad')],
    };
  }
  const u = currentUser(session);
  const head = line(`GET ${raw}   (Cookie: session=${u})`, 'muted');

  if (m[1] === 'me') {
    if (m[3]) return { lines: [head, line('404 Not Found', 'warn')] };
    const info = DEMO_USERS[u];
    return { lines: [head, line(`200 {"id":"${u}","name":"${info.name}","company":"${info.company}"}`, 'ok')] };
  }

  if (!m[3]) {
    const own = DEMO_INVOICES.filter((inv) => inv.owner === u);
    return {
      lines: [
        head,
        line('200 あなたの請求書一覧', 'ok'),
        ...own.map((inv) => line(`  #${inv.id}  ${inv.title}  ${yen(inv.amount)}`)),
        line('URLの末尾の番号（ID）で1件ずつ取得できます', 'muted'),
      ],
      flags: ['m3-own'],
    };
  }

  const id = Number(m[3]);
  const inv = vulnerableGetInvoice(u, id);
  if (!inv) return { lines: [head, line('404 請求書が見つかりません', 'warn')] };
  if (inv.owner === u) {
    return { lines: [head, line(`200 #${inv.id} ${inv.title} ${yen(inv.amount)}`, 'ok')] };
  }
  const owner = DEMO_USERS[inv.owner];
  return {
    lines: [
      head,
      line(`200 #${inv.id} ${inv.title} ${yen(inv.amount)}`, 'bad'),
      line(`    宛先: ${owner.company} ${owner.name}`, 'bad'),
      line(`! ${u} なのに、他社（${inv.owner}）の請求書が見えています`, 'bad'),
    ],
    flags: ['m3-idor'],
    events: [{ level: 'alert', source: 'API', message: `${u} が他人の請求書 #${inv.id} を取得できた` }],
  };
}

export const dataLeak: MissionDef = {
  id: 'data-leak',
  code: 'MISSION 03',
  title: 'DATA LEAK',
  subtitle: 'アクセス権限の不備',
  difficulty: '初級〜中級',
  baseXp: 200,
  defenseXp: 100,
  briefing:
    '取引先ポータルの請求書APIで「他社の請求書が見えた」という通報があった。テストアカウント user-a として、本当に他人のデータが見えるのかを確かめ、原因の処理を特定せよ。',
  objective: 'user-a として請求書APIを操作し、他人（user-b）のデータが見える不具合を再現。原因になっている処理を submit で報告する。',
  focusNodes: ['internet', 'fw-01', 'api-01', 'db-01'],
  targetNode: 'api-01',
  alertFlag: 'm3-idor',
  targetView: 'invoices',
  commands: [
    CMD.help,
    CMD.status,
    CMD.whoami,
    CMD.request,
    CMD.login,
    CMD.inspect,
    CMD.logs,
    CMD.submit,
    CMD.history,
    CMD.clear,
  ],
  intro: [
    line('ZERO CORP 仮想演習環境に接続しました（すべて架空のデータです）', 'system'),
    line('MISSION 03: DATA LEAK — 請求書APIのアクセス制御を検証せよ', 'accent'),
    line('現在 user-a としてログイン中。request /api/invoices から始めよう', 'muted'),
  ],
  scan: {},
  inspect: {
    'api-01': {
      lines: [
        line('[api-01] 取引先ポータル API'),
        line('エンドポイント: GET /api/me, GET /api/invoices, GET /api/invoices/{id}'),
        line('処理の中身は inspect api-01:invoice-handler で確認できます', 'muted'),
      ],
    },
    'api-01:invoice-handler': {
      lines: [
        line('// GET /api/invoices/{id}'),
        line('function getInvoice(req) {'),
        line('  if (!req.session) return 401;'),
        line('  const invoice = db.invoices.find(req.params.id);'),
        line('  return invoice;   // ← 誰の請求書かを確認していない', 'bad'),
        line('}'),
        line('! ログインしているかは見ているが、「その人の請求書か」は見ていません', 'bad'),
      ],
      flags: ['m3-code'],
      events: [{ level: 'warn', source: 'INSPECT', message: '請求書取得処理に所有者チェックがない' }],
    },
    'db-01:invoices': {
      lines: [
        line('id    owner   title'),
        ...DEMO_INVOICES.map((inv) => line(`${inv.id}  ${inv.owner}  ${inv.title}`)),
        line('データには owner（所有者）が正しく記録されています', 'ok'),
      ],
    },
    'db-01': {
      lines: [line('[db-01] 内部DB。テーブル: invoices（inspect db-01:invoices）')],
    },
  },
  logs: {
    'api-01': {
      lines: [
        line('時刻      ユーザー  リクエスト              結果'),
        line('10:02:11  user-a    GET /api/invoices       200'),
        line('10:02:15  user-a    GET /api/invoices/1001  200'),
        line('22:47:03  user-x    GET /api/invoices/1002  200', 'warn'),
        line('22:47:04  user-x    GET /api/invoices/1003  200', 'bad'),
        line('22:47:05  user-x    GET /api/invoices/1004  200', 'bad'),
        line('! 1秒ごとに番号を1つずつ増やして取得している利用者がいます', 'bad'),
      ],
      flags: ['m3-logs'],
      events: [{ level: 'alert', source: 'LOGS', message: '連番IDを順番に取得するアクセスを確認' }],
    },
  },
  custom: { whoami, request, login },
  cheatExamples: {
    whoami: ['whoami'],
    request: ['request /api/me', 'request /api/invoices'],
    login: ['login user-a', 'login user-b'],
  },
  requiredFlags: [
    { id: 'm3-own', label: '自分の請求書一覧を確認する' },
    { id: 'm3-idor', label: '他人の請求書が見えることを再現する' },
    { id: 'm3-code', label: '原因の処理を確認する' },
  ],
  answer: 'api-01:invoice-handler',
  submitFeedback: {
    'api-01': '方向性は合っています。APIの中のどの処理か、リソース名で報告してください。',
    'db-01': 'データベースには所有者が正しく記録されています。データを返す側を疑いましょう。',
    'db-01:invoices': 'データ自体は正しいです。問題はデータを返す処理のほうにあります。',
  },
  hints: [
    '注目する場所：request /api/invoices で自分の請求書の番号（ID）を確認しよう。その番号の「となり」には何がある？',
    '調査の考え方：IDを1つずらして request /api/invoices/1003 のように他人の番号を指定してみる。見えてしまったら inspect api-01 で処理の中身を確認しよう。',
    '解答：request /api/invoices → request /api/invoices/1003 で他社の請求書が見える。inspect api-01:invoice-handler に所有者チェックがない。報告は submit api-01:invoice-handler。',
  ],
  lesson: {
    what: 'user-a がURLの番号を書き換えるだけで、他社 user-b の請求書（金額・宛先）を見ることができました。',
    why: 'APIは「ログインしているか」は確認していましたが、「その請求書の持ち主がログイン中の人か」を確認していませんでした。IDが連番なので、他人の番号も簡単に推測できました。',
    impact: '取引先の金額や契約内容がすべての利用者に漏れます。機密情報・個人情報の漏えいとして、信用の失墜や法的な問題につながります。',
    fix: 'データを返す前に必ず「データの所有者 = ログイン中のユーザー」を照合し、一致しなければ 403（または 404）を返します。IDをランダムにするのは補助的な対策です。',
    practice: '一覧画面に表示しないだけでは守ったことになりません。APIの1つ1つで権限を確認する。テストでは「自分のデータが見える」だけでなく「他人のデータが見えない」ことを必ず確かめる。',
    glossary: [
      { term: 'アクセス制御（認可）', desc: '本人確認のあと「その人に何を許すか」を決める仕組み。認証とは別物です。' },
      { term: 'IDOR', desc: 'Insecure Direct Object Reference。IDを書き換えるだけで他人のデータに届いてしまう不具合。' },
      { term: '403 / 401', desc: '401は「ログインしていない」、403は「ログインしているが権限がない」を表す応答です。' },
    ],
  },
  defense: {
    intro: '請求書APIに正しいアクセス制御を入れましょう。本人は自分の請求書を問題なく見られる必要があります。',
    settings: [
      {
        id: 'authz',
        label: '請求書取得時のチェック',
        description: 'データを返す前に何を確認するか',
        initial: 'session',
        options: [
          { value: 'none', label: 'チェックなし', safety: 'vulnerable', note: 'ログインしていなくても見える' },
          { value: 'session', label: 'ログイン済みかだけ確認', safety: 'vulnerable', note: '現在の状態。他人の請求書も見える' },
          { value: 'owner', label: '所有者IDとログインユーザーを照合', safety: 'safe', note: '本人の請求書だけを返す' },
        ],
      },
      {
        id: 'idFormat',
        label: '請求書IDの形式',
        description: 'URLに入る番号の作り方',
        initial: 'sequential',
        options: [
          { value: 'sequential', label: '連番（1001, 1002…）', safety: 'partial', note: '他人のIDを推測しやすい' },
          { value: 'uuid', label: 'ランダムなID（UUID）', safety: 'partial', note: '推測は難しくなるが、知られたら見える' },
        ],
      },
      {
        id: 'api',
        label: '請求書APIの稼働',
        description: '緊急時にAPIごと止めるか',
        initial: 'on',
        options: [
          { value: 'on', label: '稼働', safety: 'safe', note: '通常運用' },
          { value: 'off', label: '停止', safety: 'overkill', note: '漏えいは止まるが誰も使えない' },
        ],
      },
    ],
    tests: [
      {
        id: 'own-invoice',
        label: 'user-a が自分の #1001 を取得',
        expected: '200 取得できる',
        kind: 'legit',
        run: (c) =>
          c.api === 'off' ? { pass: false, actual: '503 停止中' } : { pass: true, actual: '200' },
      },
      {
        id: 'other-invoice',
        label: 'user-a が他人の請求書を取得',
        expected: '403 拒否',
        kind: 'attack',
        run: (c) => {
          if (c.api === 'off') return { pass: true, actual: '503 停止中' };
          if (c.authz === 'owner') return { pass: true, actual: '403 拒否' };
          return c.idFormat === 'uuid'
            ? { pass: false, actual: 'IDを知られると 200 で見えてしまう' }
            : { pass: false, actual: '200 他社の請求書が見えた' };
        },
      },
      {
        id: 'anonymous',
        label: '未ログインで請求書を取得',
        expected: '401 拒否',
        kind: 'attack',
        run: (c) =>
          c.api === 'off'
            ? { pass: true, actual: '503 停止中' }
            : c.authz === 'none'
              ? { pass: false, actual: '200 誰でも見えた' }
              : { pass: true, actual: '401 拒否' },
      },
      {
        id: 'other-own',
        label: 'user-b が自分の #1003 を取得',
        expected: '200 取得できる',
        kind: 'legit',
        run: (c) => (c.api === 'off' ? { pass: false, actual: '503 停止中' } : { pass: true, actual: '200' }),
      },
    ],
    successNote: 'ポイントは「ログインしているか（認証）」と「その人に見せてよいか（認可）」を分けて考えること。IDをランダムにするのは推測を難しくするだけで、照合チェックの代わりにはなりません。',
  },
};
