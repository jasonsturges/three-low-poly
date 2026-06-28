import GUI from "lil-gui";
import { NightSkybox } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Night Skybox" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const nightSkybox = new NightSkybox(990);
  const uniforms = nightSkybox.material.uniforms;
  scene.add(nightSkybox);

  const gui = new GUI();

  gui
    .addColor({ topColor: `#${uniforms.topColor.value.getHexString()}` }, "topColor")
    .name("Top Color")
    .onChange((value: string) => {
      uniforms.topColor.value.set(value);
    });

  gui
    .addColor({ bottomColor: `#${uniforms.bottomColor.value.getHexString()}` }, "bottomColor")
    .name("Bottom Color")
    .onChange((value: string) => {
      uniforms.bottomColor.value.set(value);
    });

  gui
    .add(uniforms.offset, "value", 0, 50)
    .name("Offset")
    .step(0.001)
    .onChange((value: number) => {
      uniforms.offset.value = value;
    });

  gui
    .add(uniforms.exponent, "value", 0, 3)
    .name("Exponent")
    .step(0.001)
    .onChange((value: number) => {
      uniforms.exponent.value = value;
    });

  return () => {
    gui.destroy();
    nightSkybox.geometry.dispose();
    nightSkybox.material.dispose();
    dispose();
  };
}