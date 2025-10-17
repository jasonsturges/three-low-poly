// Shader for blur transition effect
export const blurTransitionShader = {
  uniforms: {
    tDiffuse: { value: null },
    kernelSize: { value: 0.0 },
    resolution: { value: null }, // Set to new THREE.Vector2(width, height)
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
    uniform float kernelSize;
    uniform vec2 resolution;
    varying vec2 vUv;

    void main() {
      vec2 texelSize = 1.0 / resolution;
      vec4 color = vec4(0.0);
      float total = 0.0;

      // Box blur with dynamic kernel size
      float radius = kernelSize;
      for (float x = -10.0; x <= 10.0; x += 1.0) {
        for (float y = -10.0; y <= 10.0; y += 1.0) {
          float weight = 1.0 - (abs(x) + abs(y)) / (radius * 2.0 + 1.0);
          if (weight > 0.0 && abs(x) <= radius && abs(y) <= radius) {
            vec2 offset = vec2(x, y) * texelSize * 2.0;
            color += texture2D(tDiffuse, vUv + offset) * weight;
            total += weight;
          }
        }
      }

      gl_FragColor = total > 0.0 ? color / total : texture2D(tDiffuse, vUv);
    }
  `,
};
