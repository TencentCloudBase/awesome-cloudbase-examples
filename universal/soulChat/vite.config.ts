import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  // 设置基础路径，用于部署到子路径
  base: process.env.UNI_PLATFORM === 'h5' ? '/soulchat-h5/' : '/',
  // optimizeDeps: {
  //   exclude: ['@cloudbase/adapter-uni-app'],  // 排除 @cloudbase/adapter-uni-app 依赖
  // },
});
