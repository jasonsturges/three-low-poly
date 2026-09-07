import GUI from "lil-gui";
import { AmbientLight, DirectionalLight, Scene, Sprite, SRGBColorSpace } from "three";
import { clearDefaultLights } from "./clearDefaultLights";
import { createTextSprite } from "./createTextSprite";

/** Identical light directions at every sample; no environment texture or external assets. */
export function materialStudyLights(scene: Scene, gui: GUI) {
  clearDefaultLights(scene);
  const key = new DirectionalLight(0xffffff, 3);
  key.position.set(-3, 5, 6);
  const fill = new DirectionalLight(0xffffff, 1);
  fill.position.set(4, -2, 3);
  const ambient = new AmbientLight(0xffffff, 0.35);
  scene.add(key, fill, ambient);
  const folder = gui.addFolder("Lighting");
  folder.add(key, "intensity", 0, 6, 0.05).name("Key Light");
  folder.add(fill, "intensity", 0, 4, 0.05).name("Fill Light");
  folder.add(ambient, "intensity", 0, 2, 0.05).name("Ambient Light");
  folder.close();
  return () => {
    key.dispose();
    fill.dispose();
    ambient.dispose();
  };
}

/** Labels own their textures and materials; Sprite geometry is shared by Three.js. */
export function materialStudyLabels(scene: Scene) {
  const labels: Sprite[] = [];
  return {
    add(text: string, x: number, y: number, scale = 1) {
      const label = createTextSprite(text, { size: 64, scale, x, y, z: 0.05 });
      label.material.map!.colorSpace = SRGBColorSpace;
      label.material.toneMapped = false;
      label.material.depthTest = false;
      labels.push(label);
      scene.add(label);
    },
    dispose() {
      labels.forEach((label) => {
        label.material.map?.dispose();
        label.material.dispose();
      });
    },
  };
}
