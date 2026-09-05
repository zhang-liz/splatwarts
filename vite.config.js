import { defineConfig } from "vite";

export default defineConfig({
  // Spark builds its web workers from inline source. Pre-bundling rewrites it and breaks them.
  optimizeDeps: { exclude: ["@sparkjsdev/spark"] },
  server: { port: 5173 },
});
