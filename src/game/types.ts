// ===== ゲーム全体で使う型定義 =====

export type MissionId = 'recon' | 'broken-auth' | 'data-leak';

export type NodeId = 'internet' | 'fw-01' | 'web-01' | 'auth-01' | 'api-01' | 'db-01';

/** ターミナルの1行。tone で色分けする */
export type LineTone = 'input' | 'out' | 'muted' | 'ok' | 'warn' | 'bad' | 'accent' | 'system';

export interface TermLine {
  text: string;
  tone: LineTone;
}

export type LogLevel = 'info' | 'warn' | 'alert' | 'success';

export interface LogEvent {
  /** 演習開始からの操作番号（表示用） */
  step: number;
  level: LogLevel;
  source: string;
  message: string;
}

/** コマンド実行で返す出力 */
export interface Output {
  lines: TermLine[];
  /** この出力を見たことで立つ「発見フラグ」 */
  flags?: string[];
  /** イベントログに追加する内容 */
  events?: Omit<LogEvent, 'step'>[];
  /** セッションのサブ状態を更新する（ログイン中ユーザーの切替など） */
  vars?: Record<string, string>;
}

export type CommandName =
  | 'help'
  | 'status'
  | 'scan'
  | 'inspect'
  | 'logs'
  | 'clear'
  | 'history'
  | 'submit'
  | 'login'
  | 'testcase'
  | 'whoami'
  | 'request';

export interface CommandSpec {
  name: CommandName;
  usage: string;
  description: string;
}

/** ミッション固有コマンドの実装。純粋関数で、引数は検証済み */
export type CustomCommand = (args: string[], session: SessionState) => Output;

export interface RequiredFlag {
  id: string;
  label: string;
}

export interface Lesson {
  what: string;
  why: string;
  impact: string;
  fix: string;
  practice: string;
  glossary: { term: string; desc: string }[];
}

export interface DefenseOption {
  value: string;
  label: string;
  /** この選択肢単体で見たときの安全性（UIの比較表示用） */
  safety: 'vulnerable' | 'safe' | 'overkill' | 'partial';
  note: string;
}

export interface DefenseSetting {
  id: string;
  label: string;
  description: string;
  options: DefenseOption[];
  /** 初期値（＝攻略時の脆弱な設定） */
  initial: string;
}

export type DefenseConfig = Record<string, string>;

export interface DefenseTestResult {
  id: string;
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
  /** 正規利用の確認か、攻撃の再現か */
  kind: 'legit' | 'attack';
}

export interface DefenseTest {
  id: string;
  label: string;
  expected: string;
  kind: 'legit' | 'attack';
  run: (config: DefenseConfig) => { pass: boolean; actual: string };
}

export interface DefenseDef {
  intro: string;
  settings: DefenseSetting[];
  tests: DefenseTest[];
  /** 全テスト合格時の解説 */
  successNote: string;
}

/** 演習対象パネルの種類（UI側で描き分ける） */
export type TargetView = 'hosts' | 'login' | 'invoices';

export interface MissionDef {
  id: MissionId;
  code: string;
  title: string;
  subtitle: string;
  difficulty: '初級' | '初級〜中級';
  baseXp: number;
  defenseXp: number;
  briefing: string;
  objective: string;
  focusNodes: NodeId[];
  /** 弱点を抱えているノード（ネットワーク図で警告表示） */
  targetNode: NodeId;
  /** 弱点の発見とみなすフラグ（このフラグでノードを赤くする） */
  alertFlag: string;
  targetView: TargetView;
  commands: CommandSpec[];
  /** scan / inspect / logs で参照できる固定リソース（許可リスト） */
  scan: Record<string, Output>;
  inspect: Record<string, Output>;
  logs: Record<string, Output>;
  custom: Partial<Record<CommandName, CustomCommand>>;
  requiredFlags: RequiredFlag[];
  /** submit の正解（小文字） */
  answer: string;
  /** submit で受け付ける候補と、不正解時のフィードバック */
  submitFeedback: Record<string, string>;
  hints: [string, string, string];
  lesson: Lesson;
  defense: DefenseDef;
  /** 開始時にターミナルへ表示する文 */
  intro: TermLine[];
  /** チートシートに出す入力例（scan/inspect/logs 以外のコマンド用） */
  cheatExamples?: Partial<Record<CommandName, string[]>>;
}

export type SessionStatus = 'active' | 'cleared' | 'failed';

export interface SessionState {
  missionId: MissionId;
  status: SessionStatus;
  lines: TermLine[];
  log: LogEvent[];
  flags: string[];
  /** 実行したコマンド数（clear/help なども含む） */
  ops: number;
  hintsUsed: number;
  strikes: number;
  history: string[];
  /** ミッション内のサブ状態（ログイン中ユーザーなど） */
  vars: Record<string, string>;
  startedAt: number;
  endedAt?: number;
}

export interface MissionRecord {
  cleared: boolean;
  defenseCleared: boolean;
  /** 獲得済みXP（初回のみ付与） */
  missionXp: number;
  defenseXp: number;
  bestOps?: number;
  plays: number;
  lastPlayedAt?: number;
}

export interface HistoryEntry {
  missionId: MissionId;
  kind: 'clear' | 'fail' | 'defense' | 'replay';
  xp: number;
  at: number;
  ops?: number;
  hints?: number;
}

export interface HintLogEntry {
  missionId: MissionId;
  level: number;
  at: number;
}

export interface Progress {
  version: 1;
  xp: number;
  records: Record<MissionId, MissionRecord>;
  history: HistoryEntry[];
  hintLog: HintLogEntry[];
  sessions: Partial<Record<MissionId, SessionState>>;
  defenseConfigs: Partial<Record<MissionId, DefenseConfig>>;
}
