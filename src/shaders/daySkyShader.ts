import { Color, Uniform } from "three";

export interface DaySkyUniforms {
  topColor: Uniform<Color>;
  bottomColor: Uniform<Color>;
}

/**
 * Shader for a day skybox.
 *
 * Example:
 * ```
 * this.material = new ShaderMaterial({
 *   uniforms: daySkyShader.uniforms,
 *   vertexShader: daySkyShader.vertexShader,
 *   fragmentShader: daySkyShader.fragmentShader,
 *   side: BackSide,
 * }) as ShaderMaterial & { uniforms: DaySkyUniforms };
 * ```
 */
export const daySkyShader = {
  uniforms: {
    topColor: { value: new Color(0.5, 0.8, 1.0) },
    bottomColor: { value: new Color(1.0, 1.0, 1.0) },
  },
  vertexShader: `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    varying vec3 vPosition;
    void main() {
      float y = normalize(vPosition).y * 0.5 + 0.5; // Normalizing y to range 0 to 1
      gl_FragColor = vec4(mix(bottomColor, topColor, y), 1.0);
    }
  `,
};
