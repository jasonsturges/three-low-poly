import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  LinearSRGBColorSpace,
} from "three";
import GUI from "lil-gui";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Color Space" };

export default function (container: HTMLElement) {
  const { scene, camera, renderer, dispose } = createScene(container, {
    background: 0x222222,
    cameraPosition: [0, 5, 30],
  });
  clearDefaultLights(scene);
  renderer.outputColorSpace = SRGBColorSpace;

  const ambientLight = new AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const plane = new Mesh(new PlaneGeometry(100, 100), new MeshStandardMaterial({ color: 0x404040 }));
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -2;
  scene.add(plane);

  function createGradientTexture(vertical = false) {
    const canvas = document.createElement("canvas");
    canvas.width = vertical ? 256 : 1024;
    canvas.height = vertical ? 1024 : 256;
    const ctx = canvas.getContext("2d")!;
    const gradient = vertical
      ? ctx.createLinearGradient(0, 0, 0, canvas.height)
      : ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#000000");
    gradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return new CanvasTexture(canvas);
  }

  const gradientTexture1 = createGradientTexture(false);
  const gradientPlane1 = new Mesh(new PlaneGeometry(20, 4), new MeshBasicMaterial({ map: gradientTexture1 }));
  gradientPlane1.position.set(0, 8, -10);
  scene.add(gradientPlane1);

  const sphereGeometry = new SphereGeometry(1, 32, 32);
  const boxGeometry = new BoxGeometry(2, 2, 2);
  const coneGeometry = new ConeGeometry(1, 2, 32);
  const distances = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800, 0x8800ff, 0x00ff88];

  distances.forEach((distance, index) => {
    const color = colors[index % colors.length];
    const matProps = { color, roughness: 0.3, metalness: 0.7 };
    const sphere = new Mesh(sphereGeometry, new MeshStandardMaterial(matProps));
    sphere.position.set(-5, 1, distance);
    scene.add(sphere);
    const box = new Mesh(boxGeometry, new MeshStandardMaterial(matProps));
    box.position.set(0, 1, distance);
    scene.add(box);
    const cone = new Mesh(coneGeometry, new MeshStandardMaterial(matProps));
    cone.position.set(5, 1, distance);
    scene.add(cone);
  });

  const swatchColors = [0x111111, 0x333333, 0x555555, 0x777777, 0x999999, 0xbbbbbb, 0xdddddd, 0xffffff];
  swatchColors.forEach((color, index) => {
    const swatch = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({ color }));
    swatch.position.set((index - 3.5) * 2.5, 4, -10);
    scene.add(swatch);
  });

  const colorSpaceSettings = { colorSpace: "sRGB" as "sRGB" | "Linear-sRGB" };
  const colorSpaceTypes = { sRGB: SRGBColorSpace, "Linear-sRGB": LinearSRGBColorSpace };

  const updateColorSpace = () => {
    const space = colorSpaceTypes[colorSpaceSettings.colorSpace];
    renderer.outputColorSpace = space;
    gradientTexture1.colorSpace = space;
    gradientTexture1.needsUpdate = true;
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          material.needsUpdate = true;
        });
      }
    });
  };

  const gui = new GUI();
  const colorSpaceFolder = gui.addFolder("Color Space");
  colorSpaceFolder
    .add(colorSpaceSettings, "colorSpace", Object.keys(colorSpaceTypes))
    .name("Output Color Space")
    .onChange(updateColorSpace);
  colorSpaceFolder.open();

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.add(camera.position, "x", -50, 50).name("X");
  cameraFolder.add(camera.position, "y", -50, 50).name("Y");
  cameraFolder.add(camera.position, "z", -50, 50).name("Z");

  const lightFolder = gui.addFolder("Lighting");
  lightFolder.add(directionalLight, "intensity", 0, 3).name("Light Intensity");
  lightFolder.add(ambientLight, "intensity", 0, 2).name("Ambient Intensity");

  return () => {
    gui.destroy();
    gradientTexture1.dispose();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    dispose();
  };
}