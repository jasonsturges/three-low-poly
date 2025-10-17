// Shader for fade-to-color transition effect
export const fadeShader = {
  uniforms: {
    tDiffuse: { value: null },
    fadeAmount: { value: 0.0 },
    fadeColor: { value: null }, // Set to new THREE.Color()
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float fadeAmount;
    uniform vec3 fadeColor;
    varying vec2 vUv;

    vec3 linearTosRGB(vec3 color) {
      return mix(
        color * 12.92,
        1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
        step(0.0031308, color)
      );
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 blendedColor = mix(texel.rgb, fadeColor, fadeAmount);
      gl_FragColor = vec4(linearTosRGB(blendedColor), 1.0);
    }
  `,
};
