import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Windows may pass the project path with a leading backslash before `~`.
    // The frontend is served locally, so let Vite handle that normalized path.
    fs: { strict: false },
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
