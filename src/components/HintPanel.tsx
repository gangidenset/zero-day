import { LuLightbulb } from 'react-icons/lu';
import type { MissionDef } from '../game/types';

const LEVEL_LABEL = ['注目する場所', '調査の考え方', '解答と理由'];

interface Props {
  mission: MissionDef;
  used: number;
  onHint: () => void;
}

export function HintPanel({ mission, used, onHint }: Props) {
  const remaining = mission.hints.length - used;
  return (
    <div className="panel hints">
      <div className="panel-head">
        <span className="panel-title"><LuLightbulb aria-hidden /> HINT</span>
        <span className="mono dim small">{used}/3</span>
      </div>
      <ol className="hint-list">
        {mission.hints.map((h, i) => (
          <li key={i} className={`hint ${i < used ? 'is-open' : ''}`}>
            <span className="hint-level mono">LV{i + 1}</span>
            <span className="hint-label">{LEVEL_LABEL[i]}</span>
            {i < used ? <p className="hint-text">{h.replace(/^[^：]+：/, '')}</p> : <p className="hint-locked">未表示</p>}
          </li>
        ))}
      </ol>
      <button className="btn btn-ghost btn-block" onClick={onHint} disabled={remaining <= 0}>
        <LuLightbulb aria-hidden />
        {remaining > 0 ? `ヒント${used + 1}を見る（獲得XP −20%）` : 'すべてのヒントを表示済み'}
      </button>
    </div>
  );
}
