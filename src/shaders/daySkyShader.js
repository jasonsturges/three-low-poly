export const daySkyShader = {
  uniforms: {
  },
  vertexShader: `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vPosition;
    void main() {
      float y = normalize(vPosition).y * 0.5 + 0.5; // Normalizing y to range 0 to 1
      vec3 topColor = vec3(0.5, 0.8, 1.0);  // Light blue
      vec3 bottomColor = vec3(1.0, 1.0, 1.0);  // Light white/gray for the horizon
      gl_FragColor = vec4(mix(bottomColor, topColor, y), 1.0);
    }
  `,
};
