import dts from "vite-plugin-dts";
import path from "path";
import { defineConfig, UserConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [dts({ bundleTypes: true, insertTypesEntry: true })],
  // `public/` belongs to the examples host (see vite.host.config.ts), not the package.
  // Without this, Vite's default publicDir copies it straight into dist/ and npm ships it.
  publicDir: false,
  build: {
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      // No IIFE build: it needs every external as a bare global, and three ships no
      // UMD build to supply them. ESM CDNs cover the script-tag case.
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: [/^three(\/.+)?$/],
    },
  },
} satisfies UserConfig);
