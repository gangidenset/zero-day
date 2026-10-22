import { useEffect, useState } from 'react';
import { LuSmartphone, LuX, LuShare, LuSquarePlus, LuDownload } from 'react-icons/lu';
import { isIOS, isStandalone } from '../pwa';

const DISMISS_KEY = 'project-zero-day:install-dismissed';

/** Android / PC Chrome が出す「インストール可能」イベント */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** ホーム画面への追加を案内するカード（アプリとして起動中は表示しない） */
export function InstallCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed());
  const [installed, setInstalled] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden) return null;
  // インストールできる手段がない環境（埋め込み表示など）では出さない
  if (!deferred && !ios && !installed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* 保存できなくても閉じる */
    }
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  };

  return (
    <section className="install-card panel" aria-labelledby="install-h">
      <LuSmartphone className="install-icon" aria-hidden />
      <div className="install-body">
        <h2 id="install-h">アプリとしてホーム画面に追加</h2>
        {installed ? (
          <p className="ok-text">追加しました。次回からホーム画面のアイコンで起動できます。</p>
        ) : ios ? (
          <ol className="install-steps">
            <li>Safari 下部の <LuShare aria-label="共有" className="inline-icon" /> 共有ボタンを押す</li>
            <li><LuSquarePlus aria-hidden className="inline-icon" /> 「ホーム画面に追加」を選ぶ</li>
            <li>右上の「追加」を押す</li>
          </ol>
        ) : (
          <p className="muted">全画面で遊べて、電波がない場所でも動きます。</p>
        )}
      </div>
      <div className="install-actions">
        {deferred && (
          <button className="btn btn-primary" onClick={install}>
            <LuDownload aria-hidden /> 追加する
          </button>
        )}
        <button className="btn btn-ghost btn-small" onClick={dismiss} aria-label="案内を閉じる">
          <LuX aria-hidden />
        </button>
      </div>
    </section>
  );
}
