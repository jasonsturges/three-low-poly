import { Direction } from "../constants/Direction";
import { Material, Vector3 } from "three";

interface NoiseDisplacementOptions {
  time?: number;
  intensity?: number;
  direction?: Vector3;
  scale?: number;
}

/**
 * Utility function to add noise-based vertex displacement to an existing Three.js material.
 * @param {Material} material - The material to mutate, e.g., MeshStandardMaterial.
 * @param {Object} options - Options for noise modification.
 * @param {number} [options.time=0.0] - The time value for the noise function.
 * @param {number} [options.intensity=1.0] - The intensity of the displacement.
 * @param {Vector3} [options.direction=new Vector3(1, 1, 1)] - The direction of displacement.
 * @param {number} [options.scale=10.0] - The scale of the noise effect.
 */
export function addNoiseDisplacement<T extends Material>(
  material: T,
  { time = 0.0, intensity = 1.0, direction = Direction.XYZ, scale = 10.0 }: NoiseDisplacementOptions = {},
) {
  material.onBeforeCompile = (shader) => {
    // Add uniforms for time, direction, intensity, and scale
    shader.uniforms.time = { value: time };
    shader.uniforms.direction = { value: direction };
    shader.uniforms.intensity = { value: intensity };
    shader.uniforms.scale = { value: scale };

    // Add noise function and modify the vertex shader to displace vertices
    shader.vertexShader = `
      uniform float time;
      uniform vec3 direction;
      uniform float intensity;
      uniform float scale;

      float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 perm(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }

      float noise(vec3 p) {
        vec3 a = floor(p);
        vec3 d = p - a;
        d = d * d * (3.0 - 2.0 * d);

        vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
        vec4 k1 = perm(b.xyxy);
        vec4 k2 = perm(k1.xyxy + b.zzww);

        vec4 c = k2 + a.zzzz;
        vec4 k3 = perm(c);
        vec4 k4 = perm(c + 1.0);

        vec4 o1 = fract(k3 * (1.0 / 41.0));
        vec4 o2 = fract(k4 * (1.0 / 41.0));

        vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
        vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

        return o4.y * d.y + o4.x * (1.0 - d.y);
      }
    ` + shader.vertexShader;

    // Replace the vertex transformation logic to add noise-based displacement
    shader.vertexShader = shader.vertexShader.replace(
      `#include <begin_vertex>`,
      `
        vec3 transformed = vec3(position);
        float n = noise(transformed * scale + time);
        transformed += normalize(direction) * n * intensity;
        vec3 transformedNormal = normal;
      `,
    );

    // Store shader reference in material for time updates
    material.userData.shader = shader;
  };
}

/**
 * Updates the time uniform of the material's shader to animate the noise effect.
 * @param {Material} material - The material to update.
 * @param {number} deltaTime - The time increment to add.
 */
export function updateNoiseDisplacementTime<T extends Material>(material: T, deltaTime: number) {
  if (material.userData.shader) {
    material.userData.shader.uniforms.time.value += deltaTime;
  }
}
