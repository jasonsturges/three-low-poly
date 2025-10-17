// Shader for crossfade transition between two textures
export const crossfadeShader = {
  uniforms: {
    tDiffuseA: { value: null },
    tDiffuseB: { value: null },
    mixRatio: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuseA;
    uniform sampler2D tDiffuseB;
    uniform float mixRatio;
    varying vec2 vUv;

    vec3 linearTosRGB(vec3 color) {
      return mix(
        color * 12.92,
        1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
        step(0.0031308, color)
      );
    }

    void main() {
      vec4 texelA = texture2D(tDiffuseA, vUv);
      vec4 texelB = texture2D(tDiffuseB, vUv);
      vec3 blendedColor = mix(texelA.rgb, texelB.rgb, mixRatio);
      gl_FragColor = vec4(linearTosRGB(blendedColor), max(texelA.a, texelB.a));
    }
  `,
};
