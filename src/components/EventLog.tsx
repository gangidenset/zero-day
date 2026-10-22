import { LuActivity } from 'react-icons/lu';
import type { LogEvent } from '../game/types';

export function EventLog({ events }: { events: LogEvent[] }) {
  const list = [...events].reverse();
  return (
    <div className="panel eventlog">
      <div className="panel-head">
        <span className="panel-title"><LuActivity aria-hidden /> EVENT LOG</span>
        <span className="mono dim small">{events.length} 件</span>
      </div>
      <ol className="events">
        {list.map((e, i) => (
          <li key={`${e.step}-${i}`} className={`event lv-${e.level}`}>
            <span className="mono ev-step">#{String(e.step).padStart(2, '0')}</span>
            <span className="mono ev-src">{e.source}</span>
            <span className="ev-msg">{e.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
