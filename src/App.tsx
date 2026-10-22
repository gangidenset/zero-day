import { useCallback, useEffect, useState } from 'react';
import type { MissionId } from './game/types';
import { useGame } from './hooks/useGame';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Workspace } from './components/Workspace';
import { ResultScreen } from './components/ResultScreen';
import { DefenseLab } from './components/DefenseLab';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Tutorial } from './components/Tutorial';

const TUTORIAL_KEY = 'project-zero-day:tutorial-seen';

function tutorialSeen(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

function markTutorialSeen() {
  try {
    window.localStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    /* 保存できなくても続行 */
  }
}

export type Screen =
  | { name: 'dashboard' }
  | { name: 'workspace'; missionId: MissionId }
  | { name: 'result'; missionId: MissionId }
  | { name: 'defense'; missionId: MissionId };

export default function App() {
  const game = useGame();
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' });
  const [showTutorial, setShowTutorial] = useState(() => !tutorialSeen());

  const closeTutorial = useCallback(() => {
    markTutorialSeen();
    setShowTutorial(false);
  }, []);

  const go = useCallback((next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0 });
  }, []);

  const startMission = useCallback(
    (id: MissionId) => {
      game.startMission(id);
      go({ name: 'workspace', missionId: id });
    },
    [game, go],
  );

  // 画面タイトルを更新
  useEffect(() => {
    document.title =
      screen.name === 'dashboard' ? 'PROJECT: ZERO DAY' : `PROJECT: ZERO DAY — ${screen.missionId.toUpperCase()}`;
  }, [screen]);

  return (
    <div className="app">
      <Header progress={game.progress} onHome={() => go({ name: 'dashboard' })} onHelp={() => setShowTutorial(true)} />
      {game.saveError && (
        <div className="banner banner-warn" role="status">
          進行状況をブラウザに保存できませんでした（プライベートモードなど）。このタブを閉じると進捗は失われます。
        </div>
      )}
      <main className="main">
        <ErrorBoundary key={screen.name + ('missionId' in screen ? screen.missionId : '')} onHome={() => go({ name: 'dashboard' })}>
          {screen.name === 'dashboard' && (
            <Dashboard
              game={game}
              onStart={startMission}
              onDefense={(id) => go({ name: 'defense', missionId: id })}
              onHelp={() => setShowTutorial(true)}
            />
          )}
          {screen.name === 'workspace' && (
            <Workspace
              game={game}
              missionId={screen.missionId}
              onBack={() => go({ name: 'dashboard' })}
              onResult={() => go({ name: 'result', missionId: screen.missionId })}
            />
          )}
          {screen.name === 'result' && (
            <ResultScreen
              game={game}
              missionId={screen.missionId}
              onRetry={() => {
                game.resetMission(screen.missionId);
                go({ name: 'workspace', missionId: screen.missionId });
              }}
              onNext={(id) => startMission(id)}
              onDefense={() => go({ name: 'defense', missionId: screen.missionId })}
              onHome={() => go({ name: 'dashboard' })}
            />
          )}
          {screen.name === 'defense' && (
            <DefenseLab
              game={game}
              missionId={screen.missionId}
              onHome={() => go({ name: 'dashboard' })}
              onStart={() => startMission(screen.missionId)}
              onNext={(id) => startMission(id)}
            />
          )}
        </ErrorBoundary>
      </main>
      {showTutorial && (
        <Tutorial
          onClose={closeTutorial}
          onStartFirst={() => {
            closeTutorial();
            startMission('recon');
          }}
        />
      )}
      <footer className="footer">
        <span>PROJECT: ZERO DAY — DEMO BUILD</span>
        <span>すべて架空の企業・データによる仮想演習です。実在のシステムには一切接続しません。</span>
      </footer>
    </div>
  );
}
