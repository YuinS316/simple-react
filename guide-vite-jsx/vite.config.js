import { defineConfig } from "vite";
import path from "node:path";

function _resolve(dir) {
  return path.resolve(__dirname, dir);
}

export default defineConfig({
  test: {},
  esbuild: {
    jsxInject: `import React from '@/_core/React.js'`,
  },
  server: {
    port: 8000,
  },
  resolve: {
    alias: {
      "@": _resolve("src"),
    },
  },
});
