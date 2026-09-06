import { defineConfig } from "vite";
import fs from "node:fs";

// Keys live in .env as `name=value`. The dev server injects the FAL key
// into /api/llm so the browser never sees it.
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
    port: 5173, host: true, allowedHosts: true,
    proxy: {
      "/api/tts": {
        target: "https://fal.run",
        changeOrigin: true,
        rewrite: () => "/fal-ai/elevenlabs/tts/turbo-v2.5",
        headers: { Authorization: `Key ${envKey("fal-api-key")}` },
      },
      "/api/edit": {
        target: "https://fal.run",
        changeOrigin: true,
        rewrite: () => "/fal-ai/bytedance/seedream/v4/edit",
        headers: { Authorization: `Key ${envKey("fal-api-key")}` },
      },
      "/api/nb": {
        target: "https://fal.run",
        changeOrigin: true,
        rewrite: () => "/fal-ai/nano-banana/edit",
        headers: { Authorization: `Key ${envKey("fal-api-key")}` },
      },
      "/api/upscale": {
        target: "https://fal.run",
        changeOrigin: true,
        rewrite: () => "/fal-ai/aura-sr",
        headers: { Authorization: `Key ${envKey("fal-api-key")}` },
      },
      "/api/llm": {
        target: "https://fal.run",
        changeOrigin: true,
        rewrite: () => "/fal-ai/any-llm",
        headers: { Authorization: `Key ${envKey("fal-api-key")}` },
      },
    },
  },
});
