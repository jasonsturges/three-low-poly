import { Material } from "three";

/**
 * Shader modification to support instance-specific colors.
 * This function modifies the provided material to accept instance-specific colors.
 *
 * This is not generally necessary for materials that already support vertex colors,
 * but it can be useful for custom materials or when using InstancedMesh.
 *
 * Instanced meshes already allow for per-instance colors, implemented as:
 * ```ts
 *     const colors = new Float32Array(instancedMesh.count * 3);
 *     for (let i = 0; i < instancedMesh.count; i++) {
 *       const [r, g, b] = [Math.random(), Math.random(), Math.random()];
 *       colors.set([r, g, b], i * 3); // Normalized to [0, 1]
 *     }
 *     instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
 * ```
 *
 * Example usage:
 * ```ts
 *     // Material
 *     const material = new THREE.MeshStandardMaterial();
 *
 *     // Add instance color modifier
 *     addInstanceColor(material);
 *
 *     // RGB color for each instance
 *     const colors = new Float32Array(instancedMesh.count * 3);
 *     for (let i = 0; i < instancedMesh.count; i++) {
 *       getAnalogousColors(hue).forEach((color, index) => {
 *         colors[i * 3 + index] = color / 0xff;
 *       });
 *     }
 *
 *     // Add the instance color attribute to the geometry
 *     instancedMesh.geometry.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(colors, 3));
 * ```
 */
export function addInstanceColor(material:Material) {
  if (!material) {
    throw new Error("A material must be provided to add instance color support.");
  }

  // Modify the material to accept instance-specific colors using onBeforeCompile
  material.onBeforeCompile = (shader) => {
    // Add the instanceColor attribute and varying to the vertex shader
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      "attribute vec3 instanceColor;\nvarying vec3 vColor;\nvoid main() {",
    );

    // Pass the instance color to the fragment shader
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvColor = instanceColor;",
    );

    // Add varying in the fragment shader to get the color from the vertex shader
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      "varying vec3 vColor;\nvoid main() {",
    );

    // Use the instance color for the fragment color
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      "#include <dithering_fragment>\ngl_FragColor.rgb = vColor * gl_FragColor.rgb;",
    );
  };

  return material;
}
