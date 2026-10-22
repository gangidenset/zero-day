import { useState } from 'react';
import { LuPlay, LuShieldCheck, LuTrophy, LuFlag, LuHistory, LuTrash2, LuChevronRight, LuLock, LuCircleCheck, LuCircleHelp } from 'react-icons/lu';
import type { MissionId } from '../game/types';
import type { Game } from '../hooks/useGame';
import { MISSIONS, getMission } from '../game/missions';
import { MAX_TOTAL_XP, rankFor } from '../game/progress';
import { NetworkMap } from './NetworkMap';
import { InstallCard } from './InstallCard';

interface Props {
  game: Game;
  onStart: (id: MissionId) => void;
  onDefense: (id: MissionId) => void;
  onHelp: () => void;
}

const KIND_LABEL = { clear: 'クリア', replay: '再クリア', fail: '失敗', defense: '防御成功' } as const;

function formatTime(at: number): string {
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function Dashboard({ game, onStart, onDefense, onHelp }: Props) {
  const { progress } = game;
  const [confirmReset, setConfirmReset] = useState(false);
  const { rank } = rankFor(progress.xp);
  const cleared = MISSIONS.filter((m) => progress.records[m.id].cleared).length;
  const defended = MISSIONS.filter((m) => progress.records[m.id].defenseCleared).length;
  const recommended = MISSIONS.find((m) => !progress.records[m.id].cleared) ?? MISSIONS.find((m) => !progress.records[m.id].defenseCleared);
  const recSession = recommended ? progress.sessions[recommended.id] : undefined;
  const recInProgress = recSession?.status === 'active' && recSession.ops > 0;

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ZERO CORP / 仮想ネットワーク演習</p>
          <h1 className="hero-title">
            PROJECT:<br />
            <span>ZERO DAY</span>
          </h1>
          <p className="hero-tag">HACK THE SYSTEM. FIX THE FLAW.</p>
          <p className="hero-lead">
            架空企業 ZERO CORP のシステムを調査して弱点を見つけ、防御ラボで設定を直して再テストする。攻める側と守る側の両方の目線を、ブラウザの中だけで体験するセキュリティ演習です。
          </p>
        </div>
        <div className="hero-map panel">
          <div className="panel-head">
            <span className="panel-title">ZERO CORP NETWORK</span>
            <span className="chip chip-dim">SIMULATED</span>
          </div>
          <NetworkMap
            focus={recommended?.focusNodes ?? []}
            alertNodes={MISSIONS.filter((m) => progress.records[m.id].cleared && !progress.records[m.id].defenseCleared).map((m) => m.targetNode)}
            securedNodes={MISSIONS.filter((m) => progress.records[m.id].defenseCleared).map((m) => m.targetNode)}
          />
        </div>
      </section>

      <InstallCard />

      <section className="stats" aria-label="プレイヤー情報">
        <div className="stat">
          <span className="stat-label">ランク</span>
          <span className="stat-value rank-value">{rank.name}</span>
          <span className="stat-sub">{rank.label}</span>
        </div>
        <div className="stat">
          <span className="stat-label">累計XP</span>
          <span className="stat-value">{progress.xp}</span>
          <span className="stat-sub">最大 {MAX_TOTAL_XP} XP</span>
        </div>
        <div className="stat">
          <span className="stat-label">クリア</span>
          <span className="stat-value">
            {cleared}<small>/{MISSIONS.length}</small>
          </span>
          <span className="stat-sub">ミッション</span>
        </div>
        <div className="stat">
          <span className="stat-label">防御成功</span>
          <span className="stat-value">
            {defended}<small>/{MISSIONS.length}</small>
          </span>
          <span className="stat-sub">防御ラボ</span>
        </div>
      </section>

      {recommended && (
        <section className="next-up panel">
          <div className="next-up-body">
            <p className="eyebrow eyebrow-green">
              <LuFlag aria-hidden /> {progress.records[recommended.id].cleared ? '次は防御に挑戦' : cleared === 0 ? 'まずはここから' : '次のおすすめ'}
            </p>
            <h2>
              <span className="mono code">{recommended.code}</span> {recommended.title}
              <span className="title-sub"> — {recommended.subtitle}</span>
            </h2>
            <p className="muted">{recommended.briefing}</p>
          </div>
          {progress.records[recommended.id].cleared ? (
            <button className="btn btn-primary btn-lg" onClick={() => onDefense(recommended.id)}>
              <LuShieldCheck aria-hidden /> 防御ラボへ
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={() => onStart(recommended.id)}>
              <LuPlay aria-hidden /> {recInProgress ? 'ミッションを再開' : 'ミッションを開始'}
            </button>
          )}
        </section>
      )}

      <section aria-labelledby="missions-h">
        <h2 id="missions-h" className="section-title">ミッション</h2>
        <div className="mission-grid">
          {MISSIONS.map((m) => {
            const rec = progress.records[m.id];
            const s = progress.sessions[m.id];
            const inProgress = s?.status === 'active' && s.ops > 0;
            return (
              <article key={m.id} className={`mission-card ${rec.cleared ? 'is-cleared' : ''}`}>
                <div className="mission-card-top">
                  <span className="mono code">{m.code}</span>
                  <span className={`chip ${m.difficulty === '初級' ? 'chip-green' : 'chip-orange'}`}>{m.difficulty}</span>
                </div>
                <h3 className="mission-name">{m.title}</h3>
                <p className="mission-sub">{m.subtitle}</p>
                <p className="mission-brief">{m.objective}</p>
                <div className="mission-meta">
                  <span className="mono">+{m.baseXp} XP</span>
                  <span className="mono">防御 +{m.defenseXp} XP</span>
                </div>
                <div className="mission-status">
                  {rec.cleared ? (
                    <span className="chip chip-green"><LuCircleCheck aria-hidden /> CLEARED {rec.missionXp}XP</span>
                  ) : inProgress ? (
                    <span className="chip chip-cyan">調査中</span>
                  ) : (
                    <span className="chip chip-dim">未挑戦</span>
                  )}
                  {rec.defenseCleared && <span className="chip chip-green"><LuShieldCheck aria-hidden /> DEFENDED</span>}
                </div>
                <div className="mission-actions">
                  <button className="btn btn-primary" onClick={() => onStart(m.id)}>
                    <LuPlay aria-hidden /> {inProgress ? '再開' : rec.cleared ? 'もう一度' : '開始'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => onDefense(m.id)}
                    disabled={!rec.cleared}
                    title={rec.cleared ? '' : 'ミッションをクリアすると挑戦できます'}
                  >
                    {rec.cleared ? <LuShieldCheck aria-hidden /> : <LuLock aria-hidden />} 防御ラボ
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dash-bottom">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title"><LuHistory aria-hidden /> 最近のプレイ</span>
          </div>
          {progress.history.length === 0 ? (
            <p className="empty">まだ記録がありません。MISSION 01 から始めると、ここにクリアや防御の記録が並びます。</p>
          ) : (
            <ul className="history">
              {progress.history.slice(0, 8).map((h, i) => (
                <li key={`${h.at}-${i}`} className={`history-item kind-${h.kind}`}>
                  <span className="mono dim">{formatTime(h.at)}</span>
                  <span className="history-mission">{getMission(h.missionId).title}</span>
                  <span className={`chip chip-${h.kind === 'fail' ? 'red' : h.kind === 'defense' ? 'cyan' : 'green'}`}>{KIND_LABEL[h.kind]}</span>
                  <span className="mono history-xp">{h.xp > 0 ? `+${h.xp} XP` : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title"><LuTrophy aria-hidden /> ランクとXPのルール</span>
          </div>
          <ul className="rules">
            <li>ミッション初回クリアでXP獲得。ヒント1回ごとに−20%、報告ミス1回ごとに−10XP。</li>
            <li>同じミッションを再クリアしてもXPは増えません（練習は何度でもOK）。</li>
            <li>防御ラボで全テストに合格すると追加XP。</li>
            <li>使ったヒント：累計 {progress.hintLog.length} 回</li>
          </ul>
          <button className="btn btn-ghost btn-block help-link" onClick={onHelp}>
            <LuCircleHelp aria-hidden /> 遊び方をもう一度見る
          </button>
          <div className="reset-zone">
            {confirmReset ? (
              <div className="confirm-row" role="group" aria-label="初期化の確認">
                <span>XP・クリア記録・途中経過をすべて消します。よろしいですか？</span>
                <div className="confirm-buttons">
                  <button className="btn btn-danger" onClick={() => { game.resetAll(); setConfirmReset(false); }}>
                    初期化する
                  </button>
                  <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>やめる</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost btn-small" onClick={() => setConfirmReset(true)}>
                <LuTrash2 aria-hidden /> デモデータを初期化
              </button>
            )}
          </div>
        </div>
      </section>
      <p className="muted small center">
        <LuChevronRight aria-hidden /> 進行状況はこのブラウザに保存され、再読み込みしても残ります。
      </p>
    </div>
  );
}
