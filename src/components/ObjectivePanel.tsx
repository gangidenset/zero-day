import { LuTarget, LuCircleCheck, LuCircle } from 'react-icons/lu';
import type { MissionDef, SessionState } from '../game/types';
import { MAX_STRIKES } from '../game/engine';

interface Props {
  mission: MissionDef;
  session: SessionState;
}

export function ObjectivePanel({ mission, session }: Props) {
  return (
    <div className="panel objective">
      <div className="panel-head">
        <span className="panel-title"><LuTarget aria-hidden /> MISSION</span>
        <span className={`chip ${mission.difficulty === '初級' ? 'chip-green' : 'chip-orange'}`}>{mission.difficulty}</span>
      </div>
      <p className="brief">{mission.briefing}</p>
      <div className="goal">
        <span className="goal-label">目的</span>
        <p>{mission.objective}</p>
      </div>
      <div className="goal">
        <span className="goal-label">達成条件</span>
        <ul className="checklist">
          {mission.requiredFlags.map((f) => {
            const ok = session.flags.includes(f.id);
            return (
              <li key={f.id} className={ok ? 'is-done' : ''}>
                {ok ? <LuCircleCheck aria-label="完了" /> : <LuCircle aria-label="未完了" />}
                <span>{f.label}</span>
              </li>
            );
          })}
          <li className={session.status === 'cleared' ? 'is-done' : ''}>
            {session.status === 'cleared' ? <LuCircleCheck aria-label="完了" /> : <LuCircle aria-label="未完了" />}
            <span>原因を <code>submit</code> で報告する（ミス {session.strikes}/{MAX_STRIKES}）</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
