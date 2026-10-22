// ===== スマホアプリ（PWA）関連 =====

/** 本番ビルドでのみ Service Worker を登録する（オフライン対応） */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 登録できない環境（埋め込み表示など）では通常のWebページとして動く */
    });
  });
}

/** ホーム画面から起動されているか */
export function isStandalone(): boolean {
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  } catch {
    return false;
  }
}

/** iPhone / iPad の Safari か（インストール手順が他と違うため） */
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOS;
}

/** 振動でフィードバック（対応端末のみ。iPhone は非対応のため何もしない） */
export function haptic(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* 対応していなければ無視 */
  }
}
