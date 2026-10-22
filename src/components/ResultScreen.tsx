import { LuRotateCcw, LuArrowRight, LuShieldCheck, LuBookOpen, LuTrophy, LuCircleX } from 'react-icons/lu';
import type { MissionId } from '../game/types';
import type { Game } from '../hooks/useGame';
import { getMission, nextMission } from '../game/missions';

interface Props {
  game: Game;
  missionId: MissionId;
  onRetry: () => void;
  onNext: (id: MissionId) => void;
  onDefense: () => void;
  onHome: () => void;
}

const SECTIONS = [
  { key: 'what', label: 'どんな問題があったのか' },
  { key: 'why', label: 'なぜ問題が起きたのか' },
  { key: 'impact', label: '考えられる影響' },
  { key: 'fix', label: 'どう修正すべきか' },
  { key: 'practice', label: '実際の開発で注意すること' },
] as const;

export function ResultScreen({ game, missionId, onRetry, onNext, onDefense, onHome }: Props) {
  const mission = getMission(missionId);
  const session = game.progress.sessions[missionId];
  const record = game.progress.records[missionId];
  const outcome = game.outcomes[missionId];
  const success = session ? session.status === 'cleared' : record.cleared;
  const next = nextMission(missionId);

  const xpText = outcome
    ? outcome.xpGained > 0
      ? `+${outcome.xpGained} XP`
      : success
        ? '獲得済み'
        : '0 XP'
    : record.cleared
      ? `${record.missionXp} XP（獲得済み）`
      : '0 XP';

  return (
    <div className="result">
      <section className={`result-head panel ${success ? 'is-win' : 'is-lose'}`}>
        <div className="result-title">
          {success ? <LuTrophy className="result-icon" aria-hidden /> : <LuCircleX className="result-icon" aria-hidden />}
          <div>
            <p className="eyebrow">{mission.code} {mission.title} — {mission.subtitle}</p>
            <h1>{success ? 'MISSION CLEAR' : 'MISSION FAILED'}</h1>
          </div>
        </div>
        <dl className="result-stats">
          <div><dt>結果</dt><dd>{success ? '成功' : '失敗'}</dd></div>
          <div><dt>操作数</dt><dd className="mono">{session?.ops ?? '—'}</dd></div>
          <div><dt>ヒント</dt><dd className="mono">{session?.hintsUsed ?? 0}/3</dd></div>
          <div><dt>報告ミス</dt><dd className="mono">{session?.strikes ?? 0}</dd></div>
          <div><dt>獲得XP</dt><dd className="mono accent">{xpText}</dd></div>
        </dl>
        <div className="result-actions">
          <button className="btn btn-ghost" onClick={onRetry}><LuRotateCcw aria-hidden /> 再挑戦</button>
          {success && (
            <button className="btn btn-primary" onClick={onDefense}><LuShieldCheck aria-hidden /> 防御ラボへ（+{mission.defenseXp} XP）</button>
          )}
          {next ? (
            <button className="btn btn-ghost" onClick={() => onNext(next.id)}>次のミッション <LuArrowRight aria-hidden /></button>
          ) : (
            <button className="btn btn-ghost" onClick={onHome}>ダッシュボードへ</button>
          )}
        </div>
      </section>

      <section className="panel lesson">
        <div className="panel-head">
          <span className="panel-title"><LuBookOpen aria-hidden /> 発見した弱点の解説</span>
        </div>
        {success ? (
          <>
            <div className="lesson-grid">
              {SECTIONS.map((s, i) => (
                <article key={s.key} className="lesson-item">
                  <h3><span className="mono step">{i + 1}</span>{s.label}</h3>
                  <p>{mission.lesson[s.key]}</p>
                </article>
              ))}
            </div>
            <h3 className="glossary-title">用語メモ</h3>
            <dl className="glossary">
              {mission.lesson.glossary.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.desc}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="muted">
            解説はクリア後に表示されます。ヒントを使うと、調べる場所と考え方を段階的に確認できます。
          </p>
        )}
      </section>
    </div>
  );
}
