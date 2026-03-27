import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
