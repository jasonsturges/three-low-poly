import { BackSide, BoxGeometry, MathUtils, Mesh, ShaderMaterial, Vector3 } from "three";
import { atmosphericShader, AtmosphericShaderUniforms } from "../shaders/atmosphericShader";

/**
 * Atmospheric scattering skybox.
 *
 * Elevation (theta, θ): Angle measured above or below the horizon (from the xy-plane towards the zenith or nadir).
 * Azimuth (phi, φ): Angle measured around the horizon from a reference direction (e.g., north, east).
 */
export class AtmosphericSkybox extends Mesh {
  geometry: BoxGeometry;
  material: ShaderMaterial & { uniforms: AtmosphericShaderUniforms };

  constructor() {
    super();

    this.geometry = new BoxGeometry(1, 1, 1);

    this.material = new ShaderMaterial({
      uniforms: atmosphericShader.uniforms,
      vertexShader: atmosphericShader.vertexShader,
      fragmentShader: atmosphericShader.fragmentShader,
      depthWrite: false,
      side: BackSide,
    }) as ShaderMaterial & { uniforms: AtmosphericShaderUniforms };

    this.scale.setScalar(450000);

    const theta = MathUtils.degToRad(89);
    const phi = MathUtils.degToRad(180);
    const sun = new Vector3().setFromSphericalCoords(1, theta, phi);

    this.material.uniforms.sunPosition.value = sun;
  }

  /**
   * Set the sun position.
   *
   * Elevation (theta, θ)
   * - Angle measured above or below the horizon (from the xy-plane towards the zenith or nadir).
   * - Ranges from 0 to π/2 radians (or 0 to 90 degrees).
   * - This is the vertical angle in the xy-plane.
   *
   * Azimuth (phi, φ)
   * - Angle measured around the horizon from a reference direction (e.g., north, east).
   * - Ranges from 0 to 2π radians (or 0 to 360 degrees).
   * - This is the horizontal angle in the xy-plane.
   */
  sunPosition(theta: number, phi: number) {
    const sun = new Vector3();
    sun.setFromSphericalCoords(1, theta, phi);

    this.material.uniforms.sunPosition.value = sun;
  }
}
