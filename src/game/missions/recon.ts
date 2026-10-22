import type { MissionDef } from '../types';
import { line } from '../text';
import { CMD } from './common';

export const recon: MissionDef = {
  id: 'recon',
  code: 'MISSION 01',
  title: 'RECON',
  subtitle: 'システム調査',
  difficulty: '初級',
  baseXp: 100,
  defenseXp: 50,
  briefing:
    'ZERO CORP の公開Webサーバー web-01 で「何かがおかしい」という報告が入った。外から見える情報だけを手がかりに、危険な設定を見つけ出せ。',
  objective: '外部に公開されている web-01 を調べ、本来公開すべきでない設定を特定して submit で報告する。',
  focusNodes: ['internet', 'fw-01', 'web-01'],
  targetNode: 'web-01',
  alertFlag: 'm1-port',
  targetView: 'hosts',
  commands: [CMD.help, CMD.status, CMD.scan, CMD.inspect, CMD.logs, CMD.submit, CMD.history, CMD.clear],
  intro: [
    line('ZERO CORP 仮想演習環境に接続しました（すべて架空のデータです）', 'system'),
    line('MISSION 01: RECON — 外部公開ホスト web-01 を調査せよ', 'accent'),
    line('まずは help で使えるコマンドを確認しよう', 'muted'),
  ],
  scan: {
    'web-01': {
      lines: [
        line('Scanning web-01 (198.51.100.24) ... 演習用の定義済みポートのみ', 'muted'),
        line('PORT      STATE  SERVICE'),
        line('80/tcp    open   http     → https へ転送'),
        line('443/tcp   open   https    コーポレートサイト'),
        line('8080/tcp  open   http-alt "ZeroOps Console"', 'warn'),
        line('! 一般的な公開Webサーバーでは見かけないポートが開いています', 'warn'),
      ],
      flags: ['m1-port'],
      events: [{ level: 'warn', source: 'SCAN', message: 'web-01 で想定外の公開ポート 8080 を検出' }],
    },
    'fw-01': {
      lines: [
        line('Scanning fw-01 (198.51.100.1) ...', 'muted'),
        line('PORT      STATE     SERVICE'),
        line('22/tcp    filtered  ssh'),
        line('443/tcp   open      vpn-gateway'),
        line('問題は見当たりません。ファイアウォールの設定は inspect fw-01:rules で確認できます', 'muted'),
      ],
    },
    'db-01': {
      lines: [
        line('Scanning db-01 ...', 'muted'),
        line('応答なし: db-01 は内部ネットワーク専用です（外部から見えないのは正常）', 'ok'),
      ],
    },
  },
  inspect: {
    'web-01': {
      lines: [
        line('[web-01] 公開Webサーバー'),
        line('OS: ZeroLinux 22.04 (架空)    役割: コーポレートサイト'),
        line('公開ポート: 80 / 443 / 8080'),
        line('ポートごとの詳細は inspect web-01:<ポート番号> で確認できます', 'muted'),
      ],
    },
    'web-01:80': {
      lines: [line('[web-01:80] HTTP。すべて https (443) へ転送しています。問題なし', 'ok')],
    },
    'web-01:443': {
      lines: [
        line('[web-01:443] HTTPS コーポレートサイト'),
        line('証明書: 有効 / TLS 1.3 / 一般公開が前提のページです', 'ok'),
      ],
    },
    'web-01:8080': {
      lines: [
        line('[web-01:8080] ZeroOps Console v2.3（社内向け運用ツール）', 'warn'),
        line('公開範囲   : 0.0.0.0/0  ← 全世界からアクセス可能', 'bad'),
        line('debug mode : ON         ← 開発用モードのまま', 'bad'),
        line('/debug/env : 有効       ← 環境変数を表示するページ', 'bad'),
        line('  DB_HOST=db-01.internal', 'muted'),
        line('  DB_PASSWORD=******** (演習用に伏せ字)', 'muted'),
        line('  API_SECRET=******** (演習用に伏せ字)', 'muted'),
        line('! 社内向けツールが、秘密情報ごと外部に公開されています', 'bad'),
      ],
      flags: ['m1-debug'],
      events: [{ level: 'alert', source: 'INSPECT', message: '運用コンソールがデバッグモードで全公開されている' }],
    },
    'fw-01': {
      lines: [line('[fw-01] 境界ファイアウォール。ルール一覧は inspect fw-01:rules')],
    },
    'fw-01:rules': {
      lines: [
        line('#  FROM        TO           PORT   ACTION  COMMENT'),
        line('10 any         web-01       80     allow   website'),
        line('11 any         web-01       443    allow   website'),
        line('14 any         web-01       8080   allow   "一時的に開放 動作確認用"', 'warn'),
        line('20 vpn-users   10.0.0.0/8   any    allow   社内'),
        line('99 any         any          any    deny    default'),
        line('ルール14は「一時的」のまま残っているようです', 'muted'),
      ],
      flags: ['m1-rule'],
    },
    'db-01': {
      lines: [line('[db-01] 内部データベース。外部からは到達できません', 'ok')],
    },
  },
  logs: {
    'web-01': {
      lines: [
        line('時刻      送信元          リクエスト              結果'),
        line('02:14:07  203.0.113.45    GET :443/              200'),
        line('02:15:31  203.0.113.88    GET :8080/             200', 'warn'),
        line('02:15:33  203.0.113.88    GET :8080/debug/env    200', 'bad'),
        line('02:41:02  192.0.2.17      GET :8080/debug/env    200', 'bad'),
        line('03:02:55  203.0.113.45    GET :443/recruit       200'),
        line('! 社外のIPアドレスが運用コンソールの /debug/env を取得しています', 'bad'),
      ],
      flags: ['m1-logs'],
      events: [{ level: 'alert', source: 'LOGS', message: '外部IPから /debug/env へのアクセス記録を確認' }],
    },
    'fw-01': {
      lines: [
        line('02:15:31  ALLOW  203.0.113.88 → web-01:8080  (rule 14)', 'warn'),
        line('02:16:10  DENY   203.0.113.88 → db-01:5432   (rule 99)', 'ok'),
      ],
    },
  },
  custom: {},
  requiredFlags: [
    { id: 'm1-port', label: '想定外の公開ポートを見つける' },
    { id: 'm1-debug', label: 'そのポートで動くサービスの設定を確認する' },
    { id: 'm1-logs', label: '外部から実際にアクセスされた証拠を見つける' },
  ],
  answer: 'web-01:8080',
  submitFeedback: {
    'web-01': '方向性は合っています。どのポートが問題なのか、もう一段具体的に報告してください。',
    'web-01:80': '80番は https への転送だけで、問題はありません。',
    'web-01:443': '443番は一般公開が前提のコーポレートサイトです。',
    'fw-01': 'ファイアウォールは穴を開けた「経路」です。危険な設定を持つサービス本体を報告してください。',
    'fw-01:rules': 'ルール14は穴を開けた「経路」です。危険な設定を持つサービス本体を報告してください。',
    'db-01': 'db-01 は外部から到達できず、正しく守られています。',
  },
  hints: [
    '注目する場所：外部に公開されている web-01 の「ポート」に注目しよう。まずは scan web-01 から。',
    '調査の考え方：普通の公開Webサーバーが開けるのは 80 と 443 くらい。それ以外の番号があれば inspect で中身を、logs で誰が触っているかを確認しよう。',
    '解答：scan web-01 → inspect web-01:8080 → logs web-01 で証拠がそろう。報告は submit web-01:8080。社内向け運用コンソールがデバッグモードのまま全世界に公開され、秘密情報が見えていた。',
  ],
  lesson: {
    what: '社内の運用担当だけが使うはずの管理画面（ZeroOps Console）が、ポート 8080 で全世界に公開されていました。しかもデバッグモードのままで、データベースのパスワードなどを表示するページまで開いていました。',
    why: '動作確認のために「一時的に」ファイアウォールを開け、そのまま閉じ忘れていました。開発時の便利機能（デバッグモード）も本番でオフにしていませんでした。',
    impact: '攻撃者はパスワードやAPIキーを手に入れ、データベースへの侵入や、なりすましに使えます。ログを見る限り、すでに社外から取得されています。',
    fix: '管理画面は社内VPNからだけ届くようにし、デバッグモードと環境変数の表示ページを本番では無効にします。漏れた可能性のあるパスワードやキーはすべて交換します。',
    practice: '「一時的な変更」には期限と担当者を決めて記録する。本番に出す前に、公開ポート一覧と設定（デバッグ無効など）をチェックリストで確認する。定期的に自分たちのシステムを外から見て、想定外の公開がないか確かめる。',
    glossary: [
      { term: 'ポート', desc: 'サーバーの「窓口番号」。80/443 はWeb、8080 は開発や管理ツールでよく使われます。' },
      { term: 'デバッグモード', desc: '開発者が不具合を調べるための詳細表示モード。内部情報が出るので本番では切ります。' },
      { term: '偵察（Recon）', desc: '攻撃の前に外から見える情報を集める段階。守る側も同じ目線で自社を点検します。' },
    ],
  },
  defense: {
    intro: '運用コンソールを「必要な人だけが、必要な機能だけを」使える状態に直しましょう。運用担当の仕事は止めないことも条件です。',
    settings: [
      {
        id: 'exposure',
        label: 'ポート 8080 の公開範囲',
        description: '誰が運用コンソールに接続できるか',
        initial: 'public',
        options: [
          { value: 'public', label: '全世界 (0.0.0.0/0)', safety: 'vulnerable', note: '誰でも管理画面に到達できる' },
          { value: 'vpn', label: '社内VPNのみ', safety: 'safe', note: '運用担当はVPN経由で使える' },
          { value: 'closed', label: 'ポートを完全に閉じる', safety: 'overkill', note: '安全だが運用担当も使えなくなる' },
        ],
      },
      {
        id: 'debug',
        label: 'デバッグモード',
        description: 'エラー時に内部情報を表示するか',
        initial: 'on',
        options: [
          { value: 'on', label: 'ON', safety: 'vulnerable', note: '内部構成やスタックトレースが見える' },
          { value: 'off', label: 'OFF', safety: 'safe', note: '利用者には一般的なエラーだけを表示' },
        ],
      },
      {
        id: 'env',
        label: '/debug/env ページ',
        description: '環境変数（パスワード等）を表示するページ',
        initial: 'on',
        options: [
          { value: 'on', label: '有効', safety: 'vulnerable', note: '秘密情報がそのまま表示される' },
          { value: 'off', label: '無効', safety: 'safe', note: '本番では存在しないページにする' },
        ],
      },
    ],
    tests: [
      {
        id: 'ext-access',
        label: '社外IPから :8080 に接続',
        expected: '遮断される',
        kind: 'attack',
        run: (c) =>
          c.exposure === 'public'
            ? { pass: false, actual: '接続できてしまった' }
            : { pass: true, actual: '遮断された' },
      },
      {
        id: 'env-leak',
        label: 'VPN内から /debug/env を取得',
        expected: '404（ページなし）',
        kind: 'attack',
        run: (c) =>
          c.exposure === 'closed'
            ? { pass: true, actual: '到達不可' }
            : c.env === 'on'
              ? { pass: false, actual: '秘密情報が表示された' }
              : { pass: true, actual: '404' },
      },
      {
        id: 'stacktrace',
        label: 'わざとエラーを起こす',
        expected: '内部情報を出さない',
        kind: 'attack',
        run: (c) =>
          c.exposure === 'closed'
            ? { pass: true, actual: '到達不可' }
            : c.debug === 'on'
              ? { pass: false, actual: 'ファイルパスやDB名が表示された' }
              : { pass: true, actual: '「エラーが発生しました」のみ' },
      },
      {
        id: 'ops-login',
        label: '運用担当がVPN経由でコンソールを使う',
        expected: '利用できる',
        kind: 'legit',
        run: (c) =>
          c.exposure === 'closed'
            ? { pass: false, actual: '接続できず業務が止まった' }
            : { pass: true, actual: '利用できた' },
      },
    ],
    successNote: '公開範囲を絞り（入口を守る）、デバッグ機能を切る（中身を守る）という二重の対策で、仮に片方が破られても被害を抑えられます。この考え方を「多層防御」と呼びます。',
  },
};

