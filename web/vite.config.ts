import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser talks to one origin; Vite forwards /api to the Express server (no CORS needed).
    proxy: { '/api': 'http://localhost:4000' },
  },
});
