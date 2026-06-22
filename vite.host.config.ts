import path from "path";
import { defineConfig, UserConfig } from "vite";

/**
 * Host (app) mode Vite config — a standalone gallery and development harness for
 * the library. This is NOT the library build (see `vite.config.ts` for lib mode)
 * and NOT the legacy MPA examples (see `vite-examples.config.ts`). Host code
 * lives in `app/` and is never published; `"files": ["dist"]` in package.json
 * enforces that.
 *
 * The package name is aliased to `src/index.ts` so example code imports the
 * library exactly as a consuming application would (`three-low-poly`), with live
 * HMR straight off source and rename/refactor operations that span both the
 * package and every example in a single edit.
 */
export default defineConfig({
  root: path.resolve(__dirname, "app"),
  base: "/three-low-poly/",
  // Reuse the existing static assets (fonts, favicon) without duplicating them.
  publicDir: path.resolve(__dirname, "public"),
  resolve: {
    alias: {
      "three-low-poly": path.resolve(__dirname, "src/index.ts"),
    },
  },
  build: {
    // Isolated from the library's `dist/` so the gallery build never clobbers
    // the published package output.
    outDir: path.resolve(__dirname, "site"),
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
} satisfies UserConfig);
