import { createShaderScene } from "../../framework/createShaderScene";

export const meta = {
  title: "Shader",
  description:
    "Full-viewport ShaderMaterial via createShaderScene() — the fragment shader " +
    "covers the entire viewer. Starting point for custom GLSL effects and skybox-style shaders.",
};

/** Contribution starter: demo fragment shader on the fullscreen harness. */
export default function (container: HTMLElement) {
  const { onFrame, material, dispose } = createShaderScene(container, {
    uniforms: {
      uTime: { value: 0 },
    },
    fragmentShader: `
      uniform vec2 uResolution;
      uniform float uTime;
      void main() {
        vec2 st = gl_FragCoord.xy / uResolution;
        float wave = abs(sin(st.x * 10.0 + uTime));
        gl_FragColor = vec4(st.x, st.y, wave, 1.0);
      }
    `,
  });

  onFrame(() => {
    material.uniforms.uTime.value += 0.02;
  });

  return () => dispose();
}