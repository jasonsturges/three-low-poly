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
      // Name the published bundle after the PACKAGE, not `index`. A consumer's
      // bundler names a shared chunk after this file; `index.*` makes it fall
      // back to the directory name (`dist-<hash>.js`), while `three-low-poly.*`
      // surfaces as `three-low-poly-<hash>.js`. This matches three
      // (`three.module.js`), lil-gui (`lil-gui.esm.js`), et al.
      fileName: (format) => `three-low-poly.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: [/^three(\/.+)?$/],
    },
  },
} satisfies UserConfig);
