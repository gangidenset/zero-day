import { useState } from 'react';
import { LuArrowLeft, LuRotateCcw, LuTrophy, LuCircleX, LuNetwork, LuTarget, LuTerminal, LuActivity } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type { MissionId, NodeId } from '../game/types';
import type { Game } from '../hooks/useGame';
import { getMission } from '../game/missions';
import { createSession, progressRatio } from '../game/engine';
import { computeMissionXp } from '../game/progress';
import { NetworkMap } from './NetworkMap';
import { Terminal } from './Terminal';
import { EventLog } from './EventLog';
import { HintPanel } from './HintPanel';
import { ObjectivePanel } from './ObjectivePanel';
import { CheatSheet } from './CheatSheet';

interface Props {
  game: Game;
  missionId: MissionId;
  onBack: () => void;
  onResult: () => void;
}

type Tab = 'brief' | 'system' | 'terminal' | 'log';

const TABS: { id: Tab; label: string; icon: IconType }[] = [
  { id: 'brief', label: '目的', icon: LuTarget },
  { id: 'terminal', label: 'ターミナル', icon: LuTerminal },
  { id: 'system', label: 'システム', icon: LuNetwork },
  { id: 'log', label: 'ログ', icon: LuActivity },
];

export function Workspace({ game, missionId, onBack, onResult }: Props) {
  const mission = getMission(missionId);
  const session = game.progress.sessions[missionId] ?? createSession(mission);
  const record = game.progress.records[missionId];
  const [tab, setTab] = useState<Tab>('terminal');
  const [confirmReset, setConfirmReset] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number }>();
  const [dismissed, setDismissed] = useState(false);
  const [typing, setTyping] = useState(false);

  const ratio = progressRatio(mission, session);
  const potentialXp = record.cleared ? 0 : computeMissionXp(mission, session.hintsUsed, session.strikes);
  const ended = session.status !== 'active';
  const alertFound = session.flags.includes(mission.alertFlag);

  const run = (cmd: string) => {
    setDismissed(false);
    game.execute(missionId, cmd);
  };

  const onNode = (id: NodeId) => {
    const verb = mission.inspect[id] ? 'inspect' : mission.scan[id] ? 'scan' : mission.logs[id] ? 'logs' : null;
    if (!verb) return;
    setPrefill({ text: `${verb} ${id}`, nonce: Date.now() });
    setTab('terminal');
  };

  return (
    <div className={`workspace ${typing ? 'is-typing' : ''}`}>
      <div className="ws-bar panel">
        <button className="btn btn-ghost btn-small ws-back" onClick={onBack} aria-label="戻る">
          <LuArrowLeft aria-hidden /> <span>戻る</span>
        </button>
        <div className="ws-title">
          <span className="mono code">{mission.code}</span>
          <strong>{mission.title}</strong>
          <span className="muted">{mission.subtitle}</span>
        </div>
        <div className="ws-progress">
          <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
            <span style={{ width: `${ratio * 100}%` }} />
          </div>
          <span className="mono small">
            {Math.round(ratio * 100)}% ・ 操作 {session.ops} ・ {record.cleared ? 'XP獲得済み' : `獲得予定 ${potentialXp} XP`}
          </span>
        </div>
        {confirmReset ? (
          <div className="confirm-inline">
            <span className="small">最初からやり直す？</span>
            <button className="btn btn-danger btn-small" onClick={() => { game.resetMission(missionId); setConfirmReset(false); setDismissed(false); }}>
              リセット
            </button>
            <button className="btn btn-ghost btn-small" onClick={() => setConfirmReset(false)}>やめる</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-small ws-reset" onClick={() => setConfirmReset(true)} aria-label="リセット">
            <LuRotateCcw aria-hidden /> <span>リセット</span>
          </button>
        )}
      </div>

      <nav className="tabs" aria-label="表示切り替え">
        {TABS.map((t) => {
          const Icon = t.icon;
          const found = mission.requiredFlags.filter((f) => session.flags.includes(f.id)).length;
          return (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
            >
              <Icon aria-hidden className="tab-icon" />
              <span className="tab-label">{t.label}</span>
              {t.id === 'brief' && (
                <span className="tab-badge mono">{found}/{mission.requiredFlags.length}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="ws-grid" data-tab={tab}>
        <div className="ws-col ws-left" data-pane="brief">
          <ObjectivePanel mission={mission} session={session} />
          <HintPanel mission={mission} used={session.hintsUsed} onHint={() => game.showHint(missionId)} />
        </div>
        <div className="ws-col ws-center" data-pane="terminal">
          <Terminal
            lines={session.lines}
            history={session.history}
            onRun={run}
            quick={['help', 'status', 'history', 'clear']}
            prefill={prefill}
            onFocusChange={setTyping}
          />
          <CheatSheet
            mission={mission}
            currentUser={session.vars.user}
            defaultOpen={session.ops < 5}
            onPick={(text) => setPrefill({ text, nonce: Date.now() })}
          />
        </div>
        <div className="ws-col ws-right" data-pane="system">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title"><LuNetwork aria-hidden /> ZERO CORP NETWORK</span>
              <span className="chip chip-dim">SIMULATED</span>
            </div>
            <NetworkMap
              focus={mission.focusNodes}
              alertNodes={alertFound && !record.defenseCleared ? [mission.targetNode] : []}
              securedNodes={record.defenseCleared ? [mission.targetNode] : []}
              onSelect={onNode}
            />
            <p className="muted small">演習対象のノードを押すと、調べるコマンドが入力欄に入ります。</p>
          </div>
        </div>
        <div className="ws-col ws-log" data-pane="log">
          <EventLog events={session.log} />
        </div>
      </div>

      {ended && !dismissed && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="end-title">
          <div className={`overlay-card panel ${session.status === 'cleared' ? 'is-win' : 'is-lose'}`}>
            {session.status === 'cleared' ? <LuTrophy className="overlay-icon" aria-hidden /> : <LuCircleX className="overlay-icon" aria-hidden />}
            <h2 id="end-title">{session.status === 'cleared' ? 'MISSION CLEAR' : 'MISSION FAILED'}</h2>
            <p className="muted">
              {session.status === 'cleared'
                ? `操作 ${session.ops} 回 ・ ヒント ${session.hintsUsed} 回`
                : '報告ミスが上限に達しました。証拠を見直して再挑戦しよう。'}
            </p>
            <div className="overlay-actions">
              <button className="btn btn-primary" onClick={onResult}>結果と解説を見る</button>
              <button className="btn btn-ghost" onClick={() => setDismissed(true)}>ターミナルに戻る</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
