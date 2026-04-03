import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { mockBattlePlugin } from "./dev/mockBattlePlugin";

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.VITE_USE_LOCAL_MOCK === "1" ? [mockBattlePlugin()] : []),
  ],
  server: {
    port: 5173,
  },
});
