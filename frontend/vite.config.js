import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: { port: 5173 },
  build: {
    outDir: resolve(repoRoot, 'frontend', 'dist'),
    emptyOutDir: true
  }
});
