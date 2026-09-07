import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  ColorManagement,
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
import { DisplayP3ColorSpace, DisplayP3ColorSpaceImpl } from "three/addons/math/ColorSpaces.js";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Color Space",
  description:
    "Compare sRGB, Linear-sRGB, and Display-P3 output. P3 requires a compatible browser and display. " +
    "Existing sRGB colors should retain their appearance in P3; a wider gamut does not by itself reduce gradient banding. " +
    "Linear-sRGB output is included for comparison and appears darker on a normal display.",
};

export default function (container: HTMLElement) {
  const { scene, camera, renderer, onFrame, dispose } = createScene(container, {
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
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
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

  // Register an additional definition without changing the shared working color space.
  ColorManagement.define({ [DisplayP3ColorSpace]: DisplayP3ColorSpaceImpl });
  const colorSpaceTypes = {
    sRGB: SRGBColorSpace,
    "Linear-sRGB": LinearSRGBColorSpace,
    "Display-P3": DisplayP3ColorSpace,
  };
  const colorSpaceSettings = {
    colorSpace: "sRGB" as keyof typeof colorSpaceTypes,
    p3Status: "Checking support…",
  };
  let configureOutput: ((space: "srgb" | "display-p3") => void) | undefined;

  const updateColorSpace = () => {
    const space = colorSpaceTypes[colorSpaceSettings.colorSpace];
    try {
      // Reconfigure the same canvas, preserving its device, format, and alpha settings.
      configureOutput?.(space === DisplayP3ColorSpace ? "display-p3" : "srgb");
      renderer.outputColorSpace = space;
    } catch {
      configureOutput?.("srgb");
      renderer.outputColorSpace = SRGBColorSpace;
      colorSpaceSettings.colorSpace = "sRGB";
      colorSpaceSettings.p3Status = "P3 unavailable; using sRGB";
      outputControl.options(["sRGB", "Linear-sRGB"]);
      outputControl.updateDisplay();
    }
  };

  const gui = new GUI();
  const colorSpaceFolder = gui.addFolder("Color Space");
  const outputControl = colorSpaceFolder
    .add(colorSpaceSettings, "colorSpace", ["sRGB", "Linear-sRGB"])
    .name("Output Color Space")
    .onChange(updateColorSpace);
  colorSpaceFolder.add(colorSpaceSettings, "p3Status").name("P3 Support").listen().disable();
  colorSpaceFolder.open();

  // The harness initializes asynchronously. Wait until its first render configures
  // the context; no framework changes or renderer/backend overrides are needed.
  const stopChecking = onFrame(() => {
    const context = renderer.domElement.getContext("webgpu") as unknown as GPUCanvasContext | null;
    if (!context || typeof context.getConfiguration !== "function") {
      colorSpaceSettings.p3Status = "Unavailable in this renderer/browser";
      stopChecking();
      return;
    }
    const configuration = context.getConfiguration();
    if (!configuration) return;
    stopChecking();
    configureOutput = (colorSpace) => context.configure({ ...configuration, colorSpace });
    try {
      configureOutput("display-p3");
      const supported = context.getConfiguration()?.colorSpace === "display-p3";
      configureOutput("srgb");
      if (!supported) {
        colorSpaceSettings.p3Status = "Unavailable in this browser";
        return;
      }
      outputControl.options(Object.keys(colorSpaceTypes));
      colorSpaceSettings.p3Status = window.matchMedia("(color-gamut: p3)").matches
        ? "Available — P3 display detected"
        : "Available — display may limit gamut";
    } catch {
      configureOutput("srgb");
      colorSpaceSettings.p3Status = "Unavailable in this browser";
    }
  });

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
