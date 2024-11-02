import { Mesh, Vector3 } from "three";
import { Sky } from "three/addons/objects/Sky.js";

class SunSkybox extends Mesh {
  constructor(
    theta = Math.PI * 0.49, // Elevation angle (0 to PI)
    phi = 2 * Math.PI * 0.25, // Azimuth angle (0 to 2*PI)
    turbidity = 10,
    rayleigh = 2,
    mieCoefficient = 0.005,
    mieDirectionalG = 0.8,
  ) {
    super();

    const sky = new Sky();
    sky.scale.setScalar(450000);
    this.add(sky);

    const skyUniforms = sky.material.uniforms;
    skyUniforms["turbidity"].value = turbidity;
    skyUniforms["rayleigh"].value = rayleigh;
    skyUniforms["mieCoefficient"].value = mieCoefficient;
    skyUniforms["mieDirectionalG"].value = mieDirectionalG;

    this.skyUniforms = skyUniforms;

    this.sunPosition(theta, phi);
  }

  sunPosition(theta, phi) {
    const sun = new Vector3();
    const skyUniforms = this.skyUniforms;

    sun.setFromSphericalCoords(1, theta, phi);
    skyUniforms["sunPosition"].value.copy(sun);
  }
}

export { SunSkybox };
