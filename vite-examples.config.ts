import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/three-low-poly",
  root: "./examples",
  publicDir: "../public",
  resolve: {
    alias: {
      "../../src/index.js": resolve(__dirname, "src/index.ts"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
