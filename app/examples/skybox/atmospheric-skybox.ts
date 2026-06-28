import { MathUtils } from "three";
import GUI from "lil-gui";
import { AtmosphericSkybox } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Atmospheric Skybox" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const skybox = new AtmosphericSkybox();
  scene.add(skybox);

  const parameters = {
    theta: MathUtils.degToRad(89),
    phi: MathUtils.degToRad(180),
    turbidity: 10,
    rayleigh: 2,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
  };

  const update = () => {
    skybox.material.uniforms.turbidity.value = parameters.turbidity;
    skybox.material.uniforms.rayleigh.value = parameters.rayleigh;
    skybox.material.uniforms.mieCoefficient.value = parameters.mieCoefficient;
    skybox.material.uniforms.mieDirectionalG.value = parameters.mieDirectionalG;
    skybox.sunPosition(parameters.theta, parameters.phi);
  };

  const gui = new GUI();
  gui.add(parameters, "turbidity", 0.0, 20.0, 0.1).name("Turbidity").onChange(update);
  gui.add(parameters, "rayleigh", 0.0, 4.0, 0.1).name("Rayleigh").onChange(update);
  gui.add(parameters, "mieCoefficient", 0.0, 0.1, 0.001).name("Mie Coefficient").onChange(update);
  gui.add(parameters, "mieDirectionalG", 0.0, 1.0, 0.01).name("Mie Directional G").onChange(update);
  gui.add(parameters, "theta", 0, Math.PI, 0.01).name("Sun Elevation").onChange(update);
  gui.add(parameters, "phi", 0, 2 * Math.PI, 0.01).name("Sun Azimuth").onChange(update);

  return () => {
    gui.destroy();
    skybox.geometry.dispose();
    skybox.material.dispose();
    dispose();
  };
}