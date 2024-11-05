/**
 * Utility function to add water-like vertex displacement to an existing Three.js material.
 * @param {Material} material - The material to mutate, e.g., MeshStandardMaterial.
 * @param {Object} options - Options for water wave modification.
 * @param {number} [options.time=0.0] - The time value for the wave function.
 * @param {number} [options.waveFrequency=0.2] - The frequency of the water waves.
 * @param {number} [options.waveAmplitude=0.5] - The amplitude of the water waves.
 */
export function addWaterDisplacement(material, { time = 0.0, waveFrequency = 0.2, waveAmplitude = 0.5 } = {}) {
  material.onBeforeCompile = (shader) => {
    // Add uniforms for time, wave frequency, and wave amplitude
    shader.uniforms.time = { value: time };
    shader.uniforms.waveFrequency = { value: waveFrequency };
    shader.uniforms.waveAmplitude = { value: waveAmplitude };

    // Inject the water-like wave displacement code in the vertex shader
    shader.vertexShader = `
      uniform float time;
      uniform float waveFrequency;
      uniform float waveAmplitude;

      vec3 waterDisplacement(vec3 position, vec3 normal) {
        vec3 displaced = position;

        // Displace along the normal direction instead of local y-axis
        displaced += normal * (sin(position.x * waveFrequency + time) * waveAmplitude);
        displaced += normal * (cos(position.z * waveFrequency + time) * waveAmplitude);

        return displaced;
      }
    ` + shader.vertexShader;

    // Replace the vertex transformation logic to add displacement based on the normal
    shader.vertexShader = shader.vertexShader.replace(
      `#include <begin_vertex>`,
      `
        vec3 transformed = waterDisplacement(position, normal);
      `
    );

    // Store shader reference in material for time updates
    material.userData.shader = shader;
  };
}

/**
 * Updates the time uniform of the material's shader to animate the water effect.
 * @param {Material} material - The material to update.
 * @param {number} deltaTime - The time increment to add.
 */
export function updateWaterDisplacementTime(material, deltaTime) {
  if (material.userData.shader) {
    material.userData.shader.uniforms.time.value += deltaTime;
  }
}
