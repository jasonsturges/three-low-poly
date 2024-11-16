import { Color, Uniform } from "three";

export interface NightSkyUniforms {
  topColor: Uniform<Color>;
  bottomColor: Uniform<Color>;
  offset: Uniform<number>;
  exponent: Uniform<number>;
}

/**
 * Shader for a night skybox.
 *
 * Example:
 * ```
 * this.material = new ShaderMaterial({
 *   vertexShader: nightSkyShader.vertexShader,
 *   fragmentShader: nightSkyShader.fragmentShader,
 *   uniforms: nightSkyShader.uniforms,
 *   side: BackSide,
 * }) as ShaderMaterial & { uniforms: NightSkyUniforms };
 * ```
 */
export const nightSkyShader = {
  uniforms: {
    topColor: { value: new Color(0x000033) },
    bottomColor: { value: new Color(0x000011) },
    offset: { value: 33 },
    exponent: { value: 0.6 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `,
};
