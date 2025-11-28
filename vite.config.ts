import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Using '.' instead of process.cwd() to avoid type errors with inconsistent Process definitions
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY is available in the browser
      // Supports both GEMINI_API_KEY (from .env.local) and API_KEY (for Netlify)
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY || process.env.API_KEY),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
    },
  };
});