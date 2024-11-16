import dts from "vite-plugin-dts";
import path from "path";
import { defineConfig, UserConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [dts({ rollupTypes: true })],
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "ThreeLowPoly",
      formats: ["es", "cjs", "umd", "iife"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // Exclude any import that begins with "three"
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
