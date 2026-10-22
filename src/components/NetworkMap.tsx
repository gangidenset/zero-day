import type { NodeId } from '../game/types';

interface NodeDef {
  id: NodeId;
  x: number;
  y: number;
  label: string;
  role: string;
}

const NODES: NodeDef[] = [
  { id: 'internet', x: 42, y: 112, label: 'INTERNET', role: '外部' },
  { id: 'fw-01', x: 132, y: 112, label: 'fw-01', role: 'FW' },
  { id: 'web-01', x: 236, y: 38, label: 'web-01', role: 'WEB' },
  { id: 'auth-01', x: 236, y: 112, label: 'auth-01', role: 'AUTH' },
  { id: 'api-01', x: 236, y: 186, label: 'api-01', role: 'API' },
  { id: 'db-01', x: 330, y: 149, label: 'db-01', role: 'DB' },
];

const EDGES: [NodeId, NodeId][] = [
  ['internet', 'fw-01'],
  ['fw-01', 'web-01'],
  ['fw-01', 'auth-01'],
  ['fw-01', 'api-01'],
  ['auth-01', 'db-01'],
  ['api-01', 'db-01'],
];

const byId = (id: NodeId) => NODES.find((n) => n.id === id)!;

interface Props {
  focus: NodeId[];
  alertNodes?: NodeId[];
  securedNodes?: NodeId[];
  onSelect?: (id: NodeId) => void;
}

/** ZERO CORP の簡易ネットワーク図（SVG） */
export function NetworkMap({ focus, alertNodes = [], securedNodes = [], onSelect }: Props) {
  const hasFocus = focus.length > 0;
  const state = (id: NodeId) =>
    securedNodes.includes(id) ? 'secured' : alertNodes.includes(id) ? 'alert' : focus.includes(id) ? 'focus' : hasFocus ? 'dim' : 'idle';

  return (
    <div className="netmap">
      <svg viewBox="0 0 372 224" role="img" aria-label="ZERO CORP ネットワーク図">
        <defs>
          <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M12 0H0V12" fill="none" stroke="var(--grid)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="372" height="224" fill="url(#grid)" />
        {/* 社内ゾーン */}
        <rect x="186" y="10" width="178" height="206" rx="8" fill="none" stroke="var(--line)" strokeDasharray="3 4" />
        <text x="358" y="210" textAnchor="end" className="zone-label">ZERO CORP 社内 / DMZ</text>
        {EDGES.map(([a, b]) => {
          const na = byId(a);
          const nb = byId(b);
          const active = focus.includes(a) && focus.includes(b);
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              className={`edge ${active ? 'edge-active' : ''}`}
            />
          );
        })}
        {NODES.map((n) => {
          const st = state(n.id);
          const clickable = Boolean(onSelect) && st !== 'dim';
          return (
            <g
              key={n.id}
              className={`node node-${st} ${clickable ? 'node-click' : ''}`}
              transform={`translate(${n.x} ${n.y})`}
              onClick={clickable ? () => onSelect?.(n.id) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect?.(n.id);
                      }
                    }
                  : undefined
              }
              tabIndex={clickable ? 0 : undefined}
              role={clickable ? 'button' : undefined}
              aria-label={clickable ? `${n.label} を調べる` : undefined}
            >
              <rect x="-26" y="-15" width="52" height="30" rx="5" className="node-box" />
              <text y="4" textAnchor="middle" className="node-role">{n.role}</text>
              <text y="28" textAnchor="middle" className="node-label">{n.label}</text>
              {st === 'alert' && <circle cx="24" cy="-13" r="5" className="node-pin" />}
              {st === 'secured' && <circle cx="24" cy="-13" r="5" className="node-pin-ok" />}
            </g>
          );
        })}
      </svg>
      <div className="netmap-legend">
        <span><i className="lg lg-focus" />演習対象</span>
        <span><i className="lg lg-alert" />弱点あり</span>
        <span><i className="lg lg-secured" />修正済み</span>
      </div>
    </div>
  );
}
