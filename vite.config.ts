import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 相対パスで出力し、どこに置いても dist/index.html が動くようにする
export default defineConfig({
  plugins: [react()],
  base: './',
});
