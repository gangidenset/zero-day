import { LuArrowLeft, LuFlaskConical, LuLock, LuPlay, LuRotateCcw, LuShieldCheck, LuCheck, LuX, LuArrowRight } from 'react-icons/lu';
import type { MissionId } from '../game/types';
import type { Game } from '../hooks/useGame';
import { getMission, nextMission } from '../game/missions';

interface Props {
  game: Game;
  missionId: MissionId;
  onHome: () => void;
  onStart: () => void;
  onNext: (id: MissionId) => void;
}

const SAFETY_LABEL = {
  vulnerable: { text: '脆弱', cls: 'chip-red' },
  safe: { text: '安全', cls: 'chip-green' },
  overkill: { text: 'やりすぎ', cls: 'chip-orange' },
  partial: { text: '補助的', cls: 'chip-cyan' },
} as const;

export function DefenseLab({ game, missionId, onHome, onStart, onNext }: Props) {
  const mission = getMission(missionId);
  const record = game.progress.records[missionId];
  const config = game.defenseConfig(missionId);
  const outcome = game.defenseOutcomes[missionId];
  const next = nextMission(missionId);

  if (!record.cleared) {
    return (
      <div className="defense">
        <div className="panel locked">
          <LuLock className="locked-icon" aria-hidden />
          <h1>防御ラボはまだ使えません</h1>
          <p className="muted">{mission.code} {mission.title} をクリアして弱点を見つけると、ここで修正に挑戦できます。</p>
          <div className="result-actions">
            <button className="btn btn-primary" onClick={onStart}><LuPlay aria-hidden /> ミッションを開始</button>
            <button className="btn btn-ghost" onClick={onHome}>ダッシュボードへ</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="defense">
      <div className="ws-bar panel">
        <button className="btn btn-ghost btn-small" onClick={onHome}><LuArrowLeft aria-hidden /> 戻る</button>
        <div className="ws-title">
          <LuFlaskConical aria-hidden className="cyan" />
          <strong>DEFENSE LAB</strong>
          <span className="mono code">{mission.code}</span>
          <span className="muted">{mission.title}</span>
        </div>
        {record.defenseCleared && <span className="chip chip-green"><LuShieldCheck aria-hidden /> 防御済み +{record.defenseXp}XP</span>}
      </div>

      <p className="defense-intro">{mission.defense.intro}</p>

      <div className="defense-grid">
        <section className="panel" aria-labelledby="settings-h">
          <div className="panel-head">
            <span className="panel-title" id="settings-h">設定を変更する</span>
            <button className="btn btn-ghost btn-small" onClick={() => game.resetDefense(missionId)}>
              <LuRotateCcw aria-hidden /> 攻略時の設定に戻す
            </button>
          </div>
          <div className="settings">
            {mission.defense.settings.map((s) => (
              <fieldset key={s.id} className="setting">
                <legend>
                  <code>{s.label}</code>
                  <span className="muted small">{s.description}</span>
                </legend>
                <div className="options">
                  {s.options.map((o) => {
                    const id = `opt-${s.id}-${o.value}`;
                    const tag = SAFETY_LABEL[o.safety];
                    return (
                      <label key={o.value} htmlFor={id} className={`option ${config[s.id] === o.value ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          id={id}
                          name={`setting-${s.id}`}
                          value={o.value}
                          checked={config[s.id] === o.value}
                          onChange={() => game.setDefenseValue(missionId, s.id, o.value)}
                        />
                        <span className="option-main">
                          <span className="option-label">{o.label}</span>
                          <span className={`chip ${tag.cls}`}>{tag.text}</span>
                        </span>
                        <span className="option-note">{o.note}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="compare-h">
          <div className="panel-head">
            <span className="panel-title" id="compare-h">比較：攻略時 → 現在</span>
          </div>
          <div className="table-wrap">
            <table className="compare">
              <thead>
                <tr><th>項目</th><th>攻略時（脆弱）</th><th>現在</th></tr>
              </thead>
              <tbody>
                {mission.defense.settings.map((s) => {
                  const before = s.options.find((o) => o.value === s.initial)!;
                  const now = s.options.find((o) => o.value === config[s.id]) ?? before;
                  return (
                    <tr key={s.id}>
                      <td><code>{s.label}</code></td>
                      <td className="bad-text">{before.label}</td>
                      <td className={now.safety === 'safe' ? 'ok-text' : now.safety === 'vulnerable' ? 'bad-text' : 'warn-text'}>{now.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button className="btn btn-primary btn-block btn-lg" onClick={() => game.retest(missionId)}>
            <LuPlay aria-hidden /> 再テストを実行
          </button>

          {outcome ? (
            <div className="test-results" aria-live="polite">
              <p className="mono small">
                攻撃ブロック {outcome.run.attackBlocked}/{outcome.run.attackTotal} ・ 正規利用 {outcome.run.legitOk}/{outcome.run.legitTotal}
              </p>
              <ul>
                {outcome.run.results.map((r) => (
                  <li key={r.id} className={`test ${r.pass ? 'pass' : 'fail'}`}>
                    {r.pass ? <LuCheck aria-label="合格" /> : <LuX aria-label="不合格" />}
                    <span className={`chip ${r.kind === 'attack' ? 'chip-red' : 'chip-cyan'}`}>{r.kind === 'attack' ? '攻撃' : '正規'}</span>
                    <span className="test-label">{r.label}</span>
                    <span className="test-detail small">期待: {r.expected} ／ 結果: {r.actual}</span>
                  </li>
                ))}
              </ul>
              {outcome.run.allPass ? (
                <div className="defense-win">
                  <h3><LuShieldCheck aria-hidden /> 防御成功 {outcome.xpGained > 0 ? `+${outcome.xpGained} XP` : '（XP獲得済み）'}</h3>
                  <p>{mission.defense.successNote}</p>
                  <p className="muted small">修正理由：{mission.lesson.fix}</p>
                  {next && (
                    <button className="btn btn-primary" onClick={() => onNext(next.id)}>
                      次のミッションへ <LuArrowRight aria-hidden />
                    </button>
                  )}
                </div>
              ) : (
                <p className="warn-text small">
                  まだ合格していないテストがあります。攻撃を止めるだけでなく、正しい利用者が使えることも確認しましょう。
                </p>
              )}
            </div>
          ) : (
            <p className="muted small">設定を変えたら再テストを実行してください。</p>
          )}
        </section>
      </div>
    </div>
  );
}
