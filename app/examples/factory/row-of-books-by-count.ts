import { InstancedMesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { centerObject, rowOfBooksByCount } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Row of Books (by Count)" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 3, 5] });

  const coverMaterial = new MeshStandardMaterial({
    color: 0x8b0000,
    metalness: 0.1,
    roughness: 0.7,
    flatShading: true,
  });
  const pagesMaterial = new MeshStandardMaterial({ color: 0xffffff, flatShading: true });

  const params = {
    count: 24,
    scaleXMin: 0.4,
    scaleXMax: 0.7,
    scaleYMin: 0.3,
    scaleYMax: 0.95,
    scaleZMin: 0.1,
    scaleZMax: 0.5,
  };

  let mesh: InstancedMesh | undefined;

  const updateGeometry = () => {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    mesh = rowOfBooksByCount({
      coverMaterial,
      pagesMaterial,
      ...params,
    });
    mesh.rotation.y = Math.PI / 2;
    centerObject(mesh);
    scene.add(mesh);
  };

  const gui = new GUI();
  gui.add(params, "count", 1, 250).step(1).name("Count").onChange(updateGeometry);
  gui.add(params, "scaleYMin", 0.01, 1).step(0.01).name("Scale Y Min").onChange(updateGeometry);
  gui.add(params, "scaleYMax", 0.01, 1).step(0.01).name("Scale Y Max").onChange(updateGeometry);
  gui.add(params, "scaleXMin", 0.01, 1).step(0.01).name("Scale X Min").onChange(updateGeometry);
  gui.add(params, "scaleXMax", 0.01, 1).step(0.01).name("Scale X Max").onChange(updateGeometry);
  gui.add(params, "scaleZMin", 0.01, 1).step(0.01).name("Scale Z Min").onChange(updateGeometry);
  gui.add(params, "scaleZMax", 0.01, 1).step(0.01).name("Scale Z Max").onChange(updateGeometry);

  updateGeometry();

  return () => {
    gui.destroy();
    mesh?.geometry.dispose();
    coverMaterial.dispose();
    pagesMaterial.dispose();
    dispose();
  };
}