/// <reference types="vitest/config" />
import dns from 'node:dns';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Node отдаёт для localhost сначала IPv6 (::1), и Vite слушал бы только [::1]. С ipv4first сервер слушает 127.0.0.1:
// открываются и http://localhost:5173, и http://127.0.0.1:5173
dns.setDefaultResultOrder('ipv4first');

// gateway стенда, к которому ходит dev-сервер: локальный или test на VDS (GATEWAY_URL=http://<vds>:8090 npm run dev)
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:8090';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // порт совпадает с redirect URI клиента smart-factoring-ui в Keycloak (realm test)
    port: 5173,
    strictPort: true,
    // как nginx в образе: /api уходит в gateway с того же origin, что и UI, - CORS не нужен
    proxy: {
      '/api': { target: GATEWAY_URL, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
