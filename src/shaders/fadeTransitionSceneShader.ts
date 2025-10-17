// Shader for fade transition between two scenes through a color
export const fadeTransitionSceneShader = {
  uniforms: {
    tDiffuseA: { value: null },
    tDiffuseB: { value: null },
    mixRatio: { value: 0.0 },
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
    uniform sampler2D tDiffuseA;
    uniform sampler2D tDiffuseB;
    uniform float mixRatio;
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
      vec4 texelA = texture2D(tDiffuseA, vUv);
      vec4 texelB = texture2D(tDiffuseB, vUv);

      // Fade out to color, then fade in from color
      float fadeOut = smoothstep(0.0, 0.5, mixRatio) * 2.0;
      float fadeIn = smoothstep(0.5, 1.0, mixRatio) * 2.0 - 1.0;

      vec3 colorA = mix(texelA.rgb, fadeColor, clamp(fadeOut, 0.0, 1.0));
      vec3 colorB = mix(fadeColor, texelB.rgb, clamp(fadeIn, 0.0, 1.0));

      vec3 blendedColor = mix(colorA, colorB, step(0.5, mixRatio));
      gl_FragColor = vec4(linearTosRGB(blendedColor), 1.0);
    }
  `,
};
