import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import devErrors from "./vite-plugin-dev-errors";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // VITE_DEV_OVERLAY 控制是否显示 Vite 原生编译错误遮罩。
  // 默认显示；设置为 "false" / "0" / "off" 时关闭。
  const overlayRaw = env.VITE_DEV_OVERLAY?.toLowerCase().trim();
  const overlayEnabled = !["false", "0", "off", "no"].includes(overlayRaw ?? "");

  return {
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
      hmr: {
        overlay: overlayEnabled,
      },
      proxy: {
        "/__auth": {
          target: "https://envId-appid.tcloudbaseapp.com/",
          changeOrigin: true,
        },
      },
      allowedHosts: true,
    },
  };
});
