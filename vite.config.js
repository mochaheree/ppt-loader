import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  // 5174 belongs to BeatSync (strictPort), so both apps can run side by side.
  server: { port: 5175, strictPort: true },
});
