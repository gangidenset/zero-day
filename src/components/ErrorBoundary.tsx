import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onHome: () => void;
}

interface State {
  error: Error | null;
}

/** 画面の描画エラーを捕まえて、アプリ全体が真っ白になるのを防ぐ */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel error-panel" role="alert">
          <h2>画面の表示中にエラーが発生しました</h2>
          <p>ダッシュボードに戻ってやり直してください。繰り返す場合は、ダッシュボード下部の「デモデータを初期化」をお試しください。</p>
          <pre className="mono small">{this.state.error.message}</pre>
          <button className="btn btn-primary" onClick={() => { this.setState({ error: null }); this.props.onHome(); }}>
            ダッシュボードへ戻る
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
