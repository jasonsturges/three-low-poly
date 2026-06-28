import GUI from "lil-gui";
import { DaySkybox } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Day Skybox" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const daySkybox = new DaySkybox();
  const uniforms = daySkybox.material.uniforms;
  scene.add(daySkybox);

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

  return () => {
    gui.destroy();
    daySkybox.geometry.dispose();
    daySkybox.material.dispose();
    dispose();
  };
}