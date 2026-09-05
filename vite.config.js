import { defineConfig } from "vite";
import fs from "node:fs";

// Keys live in .env as `name=value`. The dev server injects the OpenRouter key
// into /api/chat so the browser never sees it.
function envKey(name) {
  try {
    const line = fs.readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith(name + "="));
    return line ? line.slice(name.length + 1).trim() : "";
  } catch { return ""; }
}

export default defineConfig({
  // Spark builds its web workers from inline source. Pre-bundling rewrites it and breaks them.
  optimizeDeps: { exclude: ["@sparkjsdev/spark"] },
  server: {
    port: 5173,
    proxy: {
      "/api/chat": {
        target: "https://openrouter.ai",
        changeOrigin: true,
        rewrite: () => "/api/v1/chat/completions",
        headers: { Authorization: `Bearer ${envKey("openrouter-api-key")}` },
      },
    },
  },
});
