import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import devErrors from "./vite-plugin-dev-errors";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devErrors()],
  base: "./", // 使用相对路径，解决静态托管部署时的资源加载问题
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/__auth": {
        target: "https://envId-appid.tcloudbaseapp.com/",
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
});
