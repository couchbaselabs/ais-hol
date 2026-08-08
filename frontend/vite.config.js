import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer used by WASM workers
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    port: 3000,
    host: "::",
    allowedHosts: [".gitpod.dev", ".gitpod.io", "localhost"],
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.VITE_BACKEND_PORT || 5000}`,
        changeOrigin: true,
      },
    },
  },
});
