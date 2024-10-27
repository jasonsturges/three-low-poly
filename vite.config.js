import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [],
  build: {
    minimal: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.js"),
      name: "ThreeLowPoly",
      formats: ["es", "cjs", "umd", "iife"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["three"],
      output: {
        globals: {
          three: "THREE",
        },
      },
    },
  },
});
