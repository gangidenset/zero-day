import type { CommandSpec } from '../types';

export const CMD = {
  help: { name: 'help', usage: 'help', description: '使えるコマンドを表示' },
  status: { name: 'status', usage: 'status', description: '演習環境と調査の進み具合を確認' },
  scan: { name: 'scan', usage: 'scan <ホスト>', description: '演習対象ホストの公開ポートを調査' },
  inspect: { name: 'inspect', usage: 'inspect <リソース>', description: 'リソースの詳細・設定を確認' },
  logs: { name: 'logs', usage: 'logs <ホスト>', description: 'ホストのイベントログを確認' },
  clear: { name: 'clear', usage: 'clear', description: 'ターミナル表示を消去' },
  history: { name: 'history', usage: 'history', description: '入力したコマンドの履歴を表示' },
  submit: { name: 'submit', usage: 'submit <原因>', description: '弱点の原因を報告（3回まちがえると失敗）' },
  login: { name: 'login', usage: 'login <ユーザー> [パスワード]', description: '架空のログイン画面にログインを試す' },
  testcase: { name: 'testcase', usage: 'testcase list | testcase run <ID>', description: '用意されたテストケースを実行' },
  whoami: { name: 'whoami', usage: 'whoami', description: '現在ログイン中のユーザーを表示' },
  request: { name: 'request', usage: 'request <パス>', description: '架空APIにリクエストを送る' },
} satisfies Record<string, CommandSpec>;
