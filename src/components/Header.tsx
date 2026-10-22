import type { Progress } from '../game/types';
import { rankFor } from '../game/progress';
import { LuCircleHelp } from 'react-icons/lu';
import { Logo } from './Logo';

interface Props {
  progress: Progress;
  onHome: () => void;
  onHelp: () => void;
}

export function Header({ progress, onHome, onHelp }: Props) {
  const { rank, next, ratio } = rankFor(progress.xp);
  return (
    <header className="header">
      <div className="header-inner">
        <button className="brand" onClick={onHome} aria-label="ダッシュボードへ">
          <Logo size={30} />
          <span className="brand-text">
            <span className="brand-name">PROJECT: ZERO DAY</span>
            <span className="brand-sub">HACK THE SYSTEM. FIX THE FLAW.</span>
          </span>
        </button>
        <div className="header-status">
          <button className="btn btn-ghost btn-small help-btn" onClick={onHelp}>
            <LuCircleHelp aria-hidden /> <span>遊び方</span>
          </button>
          <span className="sim-badge" title="すべて架空の仮想環境です">
            <span className="dot" /> SIMULATION
          </span>
          <div className="rank-box" aria-label={`ランク ${rank.name}、${progress.xp} XP`}>
            <div className="rank-line">
              <span className="rank-name">{rank.name}</span>
              <span className="xp-num">{progress.xp} XP</span>
            </div>
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
              <span style={{ width: `${ratio * 100}%` }} />
            </div>
            <div className="rank-next">{next ? `次: ${next.name} まで ${next.minXp - progress.xp} XP` : '最高ランク到達'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
