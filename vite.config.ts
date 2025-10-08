import dts from "vite-plugin-dts";
import path from "path";
import { defineConfig, UserConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [dts({ rollupTypes: true, insertTypesEntry: true })],
  build: {
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "ThreeLowPoly",
      formats: ["es", "cjs", "iife"],
      fileName: (format) =>
        `index.${format === "es" ? "mjs" : format === "cjs" ? "cjs" : "iife.js"}`,
    },
    rollupOptions: {
      external: [/^three(\/.+)?$/],
      output: {
        globals: {
          three: "THREE",
          "three/addons/objects/Sky.js": "Sky",
          "three/addons/utils/BufferGeometryUtils.js": "BufferGeometryUtils",
          "three/addons/postprocessing/EffectComposer.js": "EffectComposer",
          "three/addons/postprocessing/RenderPass.js": "RenderPass",
          "three/addons/postprocessing/ShaderPass.js": "ShaderPass",
        },
      },
    },
  },
} satisfies UserConfig);
