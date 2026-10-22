import { useState } from 'react';
import { LuBookOpen, LuChevronDown, LuChevronUp } from 'react-icons/lu';
import type { CommandName, MissionDef } from '../game/types';

interface Props {
  mission: MissionDef;
  currentUser?: string;
  /** 例を入力欄に入れる（実行はしない） */
  onPick: (text: string) => void;
  defaultOpen: boolean;
}

/** コマンド名ごとの補足説明（初心者向け） */
const NOTES: Partial<Record<CommandName, string>> = {
  help: 'このミッションで使えるコマンドの一覧を出します。迷ったらまずこれ。',
  status: '集めた証拠の数や、報告ミスの回数を確認できます。',
  scan: 'ホスト（サーバー）が外に向けて開けている「窓口（ポート）」を一覧にします。',
  inspect: '名前を指定して中身や設定を詳しく見ます。「ホスト名:ポート番号」のようにコロンでつなぐと、特定のポートを指定できます。',
  logs: 'そのホストで「いつ・誰が・何をしたか」の記録を見ます。',
  testcase: 'まず list で一覧を見て、run の後ろにIDを書いて1つずつ実行します。',
  login: 'ユーザー名とパスワードを半角スペースで区切って書きます。',
  whoami: '今どのユーザーとして操作しているかを表示します。',
  request: '/api/ から始まる「パス」を書きます。末尾の番号（ID）を変えると別のデータを取りにいきます。',
  history: 'これまで入力したコマンドを番号付きで表示します。',
  clear: 'ターミナルの表示を消します（証拠や進み具合は消えません）。',
  submit: '調査結果に出てきた名前（ホスト名・ポート・設定項目名など）を、そのまま1つ書きます。答えはここには載っていません。',
};

const ANATOMY: Record<MissionDef['id'], [string, string]> = {
  recon: ['scan', 'web-01'],
  'broken-auth': ['inspect', 'auth-01'],
  'data-leak': ['request', '/api/invoices'],
};

function examplesFor(mission: MissionDef, name: CommandName): string[] {
  if (name === 'scan' || name === 'inspect' || name === 'logs') {
    return Object.keys(mission[name]).map((target) => `${name} ${target}`);
  }
  if (name === 'help' || name === 'status' || name === 'history' || name === 'clear' || name === 'whoami') {
    return [name];
  }
  return mission.cheatExamples?.[name] ?? [];
}

export function CheatSheet({ mission, currentUser, onPick, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [cmd, target] = ANATOMY[mission.id];

  return (
    <section className="panel cheat" aria-labelledby="cheat-h">
      <button
        className="cheat-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="cheat-body"
      >
        <span className="panel-title" id="cheat-h"><LuBookOpen aria-hidden /> コマンドの書き方</span>
        <span className="small muted">{open ? '閉じる' : '開く'} {open ? <LuChevronUp aria-hidden /> : <LuChevronDown aria-hidden />}</span>
      </button>

      {open && (
        <div id="cheat-body" className="cheat-body">
          <div className="anatomy" aria-label={`書き方の例 ${cmd} ${target}`}>
            <div className="anatomy-row mono">
              <span className="anat-cmd">{cmd}</span>
              <span className="anat-space" aria-hidden>␣</span>
              <span className="anat-target">{target}</span>
            </div>
            <div className="anatomy-row anatomy-labels">
              <span className="anat-cmd-l">コマンド名</span>
              <span className="anat-space-l">半角スペース</span>
              <span className="anat-target-l">対象（何を調べるか）</span>
            </div>
          </div>
          <ul className="cheat-rules">
            <li><strong>半角英数字</strong>で入力します。日本語入力はオフにしてください</li>
            <li>説明にある <code>&lt;ホスト&gt;</code> の <code>&lt; &gt;</code> は「ここに名前を入れる」という印です。<code>&lt; &gt;</code> 自体は打ちません</li>
            <li>対象の名前は、画面に出てきたものをそのまま使います</li>
            <li>下の例を押すと入力欄に入ります。<kbd>Enter</kbd> で実行</li>
          </ul>

          <dl className="cheat-list">
            {mission.commands.map((c) => {
              const ex = examplesFor(mission, c.name);
              return (
                <div key={c.name} className="cheat-item">
                  <dt>
                    <code className="cheat-usage">{c.usage}</code>
                    <span className="cheat-desc">{c.description}</span>
                  </dt>
                  <dd>
                    {NOTES[c.name] && <p className="cheat-note">{NOTES[c.name]}</p>}
                    {ex.length > 0 && (
                      <div className="cheat-examples">
                        <span className="cheat-ex-label">例</span>
                        {ex.map((e) => (
                          <button key={e} type="button" className="cheat-chip mono" onClick={() => onPick(e)}>
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {currentUser && <p className="small mono muted">現在のユーザー: {currentUser}</p>}
        </div>
      )}
    </section>
  );
}
