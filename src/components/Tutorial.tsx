import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LuArrowLeft, LuArrowRight, LuX, LuPlay, LuCircleCheck, LuCircle, LuCheck } from 'react-icons/lu';
import type { TermLine } from '../game/types';

interface Props {
  onClose: () => void;
  onStartFirst: () => void;
}

/** 説明用の見本ターミナル（実際の演習とは別の静的な表示） */
function SampleTerminal({ lines }: { lines: TermLine[] }) {
  return (
    <div className="tut-term" aria-label="操作の見本">
      <span className="tut-term-tag mono">見本</span>
      {lines.map((l, i) => (
        <div key={i} className={`term-line tone-${l.tone}`}>{l.text}</div>
      ))}
    </div>
  );
}

const FLOW = [
  { n: '1', title: '調査', text: 'ターミナルでコマンドを打ち、システムを調べる' },
  { n: '2', title: '報告', text: '証拠がそろったら、原因を submit で報告' },
  { n: '3', title: '防御', text: '防御ラボで設定を直し、再テストで確かめる' },
];

const PAGES: { title: string; body: ReactNode }[] = [
  {
    title: 'PROJECT: ZERO DAY へようこそ',
    body: (
      <>
        <p>
          あなたは架空の会社 <strong>ZERO CORP</strong> のセキュリティ担当です。システムのどこかにある弱点を見つけて報告し、最後は自分の手で直します。
        </p>
        <ol className="tut-flow">
          {FLOW.map((f) => (
            <li key={f.n}>
              <span className="tut-flow-n mono">{f.n}</span>
              <strong>{f.title}</strong>
              <span>{f.text}</span>
            </li>
          ))}
        </ol>
        <p className="muted small">
          すべてブラウザの中だけの仮想演習です。実在のシステムには一切つながりません。ミッションは3つ。まずは MISSION 01 から。
        </p>
      </>
    ),
  },
  {
    title: 'ターミナルで調査する',
    body: (
      <>
        <p>
          画面中央のターミナルにコマンドを入力して <kbd>Enter</kbd>（または「実行」）。使えるコマンドは <code>help</code> で表示されます。たとえば MISSION 01 の最初の一歩はこんな感じです。
        </p>
        <SampleTerminal
          lines={[
            { text: 'zero@lab:~$ help', tone: 'input' },
            { text: '  scan <ホスト>      公開ポートを調査', tone: 'out' },
            { text: '  inspect <リソース> 詳細・設定を確認', tone: 'out' },
            { text: 'zero@lab:~$ scan web-01', tone: 'input' },
            { text: '443/tcp   open  https   コーポレートサイト', tone: 'out' },
            { text: '8080/tcp  open  http-alt "ZeroOps Console"', tone: 'warn' },
            { text: '[+] 証拠を確保 (1/3)', tone: 'accent' },
          ]}
        />
        <ul className="tut-tips">
          <li>オレンジや赤の行は「あやしい」サイン。次はそこを <code>inspect</code> で深掘りします</li>
          <li>書き方に迷ったら、ターミナルの下の<strong>「コマンドの書き方」</strong>へ。例を押すと入力欄に入ります</li>
          <li><kbd>↑</kbd><kbd>↓</kbd> キーで前に打ったコマンドを呼び出せます</li>
          <li>ネットワーク図の光っているノードを押すと、調べるコマンドが入力欄に入ります</li>
        </ul>
      </>
    ),
  },
  {
    title: '証拠を集めて、原因を報告する',
    body: (
      <>
        <p>
          大事な情報を見つけると「証拠を確保」と表示され、左の<strong>達成条件</strong>にチェックが付きます。コマンドを打つだけではチェックは付かず、正しい対象を調べたときだけ進みます。
        </p>
        <ul className="checklist tut-check">
          <li className="is-done"><LuCircleCheck aria-label="完了" /><span>想定外の公開ポートを見つける</span></li>
          <li className="is-done"><LuCircleCheck aria-label="完了" /><span>そのポートで動くサービスの設定を確認する</span></li>
          <li><LuCircle aria-label="未完了" /><span>外部から実際にアクセスされた証拠を見つける</span></li>
        </ul>
        <p>
          全部そろったら <code>submit &lt;原因&gt;</code> で報告します。正解ならクリアです。
        </p>
        <ul className="tut-tips">
          <li>証拠が足りないうちに報告しても、ミスには数えません</li>
          <li>間違った報告は <strong>3回</strong> で失敗。リセットすれば何度でも再挑戦できます</li>
        </ul>
      </>
    ),
  },
  {
    title: 'ヒントとXP',
    body: (
      <>
        <p>迷ったら左の HINT パネルへ。ヒントは3段階で、1つずつ開けていきます。</p>
        <ol className="tut-levels">
          <li><span className="mono">LV1</span>注目する場所</li>
          <li><span className="mono">LV2</span>調査の考え方</li>
          <li><span className="mono">LV3</span>解答と理由</li>
        </ol>
        <table className="tut-table">
          <tbody>
            <tr><th>クリア時のXP</th><td>MISSION 01: 100 / 02: 150 / 03: 200</td></tr>
            <tr><th>ヒント1回ごと</th><td className="warn-text">−20%</td></tr>
            <tr><th>報告ミス1回ごと</th><td className="warn-text">−10 XP</td></tr>
            <tr><th>最低保証</th><td>基本XPの30%</td></tr>
          </tbody>
        </table>
        <p className="muted small">
          XPがもらえるのは初回クリアのときだけ。2回目以降は練習として何度でも遊べます。XPがたまると ROOKIE → CADET → ANALYST → OPERATOR → ZERO DAY HUNTER とランクが上がります。
        </p>
      </>
    ),
  },
  {
    title: '防御ラボで直す',
    body: (
      <>
        <p>
          クリアすると<strong>防御ラボ</strong>が開きます。見つけた弱点の設定を選び直して「再テストを実行」。全部合格すると追加XPがもらえます。
        </p>
        <ul className="tut-tests">
          <li className="test pass"><LuCheck aria-label="合格" /><span className="chip chip-red">攻撃</span><span>社外から管理画面に接続 → 遮断された</span></li>
          <li className="test pass"><LuCheck aria-label="合格" /><span className="chip chip-cyan">正規</span><span>運用担当がVPN経由で使う → 使えた</span></li>
        </ul>
        <p>
          テストは「攻撃を止められるか」と「正しい利用者が困らないか」の2種類。何でも止める<span className="chip chip-orange">やりすぎ</span>設定を選ぶと、攻撃は止まっても正規利用のテストで不合格になります。
        </p>
      </>
    ),
  },
];

export function Tutorial({ onClose, onStartFirst }: Props) {
  const [page, setPage] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const last = page === PAGES.length - 1;

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.scrollTo({ top: 0 });
  }, [page]);

  return (
    <div className="overlay tut-overlay" role="dialog" aria-modal="true" aria-labelledby="tut-title">
      <div className="tut-card panel" ref={dialogRef} tabIndex={-1}>
        <div className="tut-head">
          <span className="eyebrow">遊び方 {page + 1}/{PAGES.length}</span>
          <button className="btn btn-ghost btn-small" onClick={onClose} aria-label="遊び方を閉じる">
            <LuX aria-hidden /> スキップ
          </button>
        </div>
        <h2 id="tut-title" className="tut-title">{PAGES[page].title}</h2>
        <div className="tut-body">{PAGES[page].body}</div>
        <div className="tut-dots" aria-hidden="true">
          {PAGES.map((_, i) => (
            <span key={i} className={i === page ? 'is-active' : ''} />
          ))}
        </div>
        <div className="tut-nav">
          <button className="btn btn-ghost" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            <LuArrowLeft aria-hidden /> 戻る
          </button>
          {last ? (
            <button className="btn btn-primary" onClick={onStartFirst}>
              <LuPlay aria-hidden /> MISSION 01 を始める
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setPage((p) => p + 1)}>
              次へ <LuArrowRight aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
