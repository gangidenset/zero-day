// CSS の import を型として許可する
declare module '*.css';

// Vite がビルド時に置き換える環境変数（使う分だけ宣言）
interface ImportMetaEnv {
  readonly PROD: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
