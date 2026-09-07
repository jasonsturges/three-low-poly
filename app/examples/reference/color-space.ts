import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  ColorManagement,
  Color,
  Group,
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
import { GroundGrid } from "three-low-poly";
import { gradientBackdrop } from "../../framework/gradientBackdrop";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { colorSpaceToWorking, mix, screenCoordinate, uniform, uv, vec3, vec4 } from "three/tsl";
import { DisplayP3ColorSpace, DisplayP3ColorSpaceImpl } from "three/addons/math/ColorSpaces.js";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Color Space",
  description:
    "Compare sRGB, Linear-sRGB, and Display-P3 output. P3 requires a compatible browser and display. " +
    "Three labeled ramps compare an 8-bit source, a floating-point shader ramp, and that ramp with dithering. " +
    "The canvas output remains 8-bit. Adjust the ramp endpoints to reveal banding. " +
    "Color pairs compare P3 originals with their clipped sRGB equivalents: they match in sRGB but can separate in P3. " +
    "Linear-sRGB output is included for comparison and appears darker on a normal display.",
};

export default function (container: HTMLElement) {
  const { scene, camera, renderer, controls, onFrame, dispose } = createScene(container, {
    cameraPosition: [0, 8, 26],
  });
  clearDefaultLights(scene);
  renderer.outputColorSpace = SRGBColorSpace;
  camera.fov = 50;
  camera.updateProjectionMatrix();
  controls.target.set(0, 6.8, 0);
  controls.update();
  const disposeBackdrop = gradientBackdrop(scene);

  const ambientLight = new AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new DirectionalLight(0xffffff, 2.5);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const grid = new GroundGrid({ size: 40, divisions: 40, planeColor: 0x0f141b, gridColor: 0x202c39, centerColor: 0x304052 });
  scene.add(grid);

  // A neutral surround keeps the dark ramps readable against the atmospheric backdrop.
  const panel = new Mesh(new PlaneGeometry(22, 12), new MeshBasicMaterial({ color: 0x171b20, toneMapped: false }));
  panel.position.set(0, 8, -0.08);
  scene.add(panel);

  // Additional gamut definition only; the shared working color space stays unchanged.
  ColorManagement.define({ [DisplayP3ColorSpace]: DisplayP3ColorSpaceImpl });
  // ColorSpaceNode returns vec4; its current type declarations omit TSL swizzles.
  function workingRGB(value: Parameters<typeof colorSpaceToWorking>[0], space: string) {
    return (colorSpaceToWorking(value, space) as unknown as ReturnType<typeof vec4>).rgb;
  }
  const labelTextures: CanvasTexture[] = [];
  function label(text: string, x: number, y: number, width = 20) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 64;
    const context = canvas.getContext("2d")!;
    context.font = "28px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#dddddd";
    context.fillText(text, 512, 32);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    labelTextures.push(texture);
    const mesh = new Mesh(
      new PlaneGeometry(width, width / 16),
      new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    mesh.position.set(x, y, 0.05);
    scene.add(mesh);
  }

  const rampSettings = { start: 0.04, end: 0.18 };
  const rampStart = uniform(rampSettings.start);
  const rampEnd = uniform(rampSettings.end);
  // Evaluated per fragment in floating point: no source texture quantization.
  const ramp = mix(rampStart, rampEnd, uv().x);
  // Static, screen-space noise of ±half an 8-bit code value, before decoding sRGB.
  const noise = screenCoordinate.xy
    .dot(vec3(0.06711056, 0.00583715, 0).xy)
    .fract()
    .mul(52.9829189)
    .fract()
    .sub(0.5)
    .div(255);
  const rampNodes = [ramp.mul(255).round().div(255), ramp, ramp.add(noise).clamp(0, 1)];
  const rampNames = [
    "8-bit source • quantized before rendering",
    "Float shader • no source texture",
    "Float shader + dithering • same 8-bit output",
  ];
  rampNodes.forEach((value, index) => {
    const material = new MeshBasicNodeMaterial();
    material.toneMapped = false;
    material.fragmentNode = vec4(workingRGB(vec3(value), SRGBColorSpace), 1);
    const mesh = new Mesh(new PlaneGeometry(20, 1.4), material);
    const y = 12 - index * 2.7;
    mesh.position.set(0, y, 0);
    scene.add(mesh);
    label(rampNames[index], 0, y + 1.05);
  });

  // A low rainbow arc supplies material highlights without obscuring the charts.
  const primitives = new Group();
  scene.add(primitives);
  const geometries = [new SphereGeometry(0.7, 32, 24), new BoxGeometry(1.25, 1.25, 1.25), new ConeGeometry(0.75, 1.5, 40)];
  for (let index = 0; index < 15; index++) {
    const t = index / 14;
    const angle = (t - 0.5) * Math.PI;
    const material = new MeshStandardMaterial({
      color: new Color().setHSL(t * 0.83, 0.88, 0.5),
      roughness: 0.23,
      metalness: 0.7,
    });
    const mesh = new Mesh(geometries[index % geometries.length], material);
    mesh.position.set((t - 0.5) * 20, index % 3 === 1 ? 0.625 : index % 3 === 2 ? 0.75 : 0.7, Math.cos(angle) * 4 + 1);
    mesh.rotation.y = -angle * 0.35;
    primitives.add(mesh);
  }

  // Each P3 color is paired with the same color clipped to the sRGB gamut.
  // fragmentNode preserves negative working-space components until output conversion.
  const patchColors = [
    [1, 0.15, 0.02],
    [1, 0.5, 0],
    [0.15, 1, 0.1],
    [0, 0.85, 0.65],
  ];
  patchColors.forEach(([r, g, b], index) => {
    const original = workingRGB(vec3(r, g, b), DisplayP3ColorSpace);
    [original.clamp(0, 1), original].forEach((value, side) => {
      const material = new MeshBasicNodeMaterial();
      material.toneMapped = false;
      material.fragmentNode = vec4(value, 1);
      const patch = new Mesh(new PlaneGeometry(2.2, 1.7), material);
      patch.position.set((index - 1.5) * 5 + (side - 0.5) * 2.3, 3.7, 0);
      scene.add(patch);
    });
  });
  label("Color pairs: sRGB clipped (left) / P3 original (right)", 0, 5.05);

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
  gui.title("Color Space");
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

  const rampFolder = gui.addFolder("Gradient Ramps");
  rampFolder
    .add(rampSettings, "start", 0, 1, 0.001)
    .name("Start (sRGB)")
    .onChange((value: number) => {
      rampStart.value = value;
    });
  rampFolder
    .add(rampSettings, "end", 0, 1, 0.001)
    .name("End (sRGB)")
    .onChange((value: number) => {
      rampEnd.value = value;
    });
  const rampActions = {
    inspectCharts() {
      camera.position.set(0, 8, 23);
      controls.target.set(0, 8, 0);
      controls.update();
    },
    sceneView() {
      camera.position.set(0, 8, 26);
      controls.target.set(0, 6.8, 0);
      controls.update();
    },
    fullRange() {
      rampSettings.start = 0;
      rampSettings.end = 1;
      syncRamp();
    },
    darkRange() {
      rampSettings.start = 0.04;
      rampSettings.end = 0.18;
      syncRamp();
    },
  };
  function syncRamp() {
    rampStart.value = rampSettings.start;
    rampEnd.value = rampSettings.end;
    rampFolder.controllers.forEach((controller) => controller.updateDisplay());
  }
  rampFolder.add(rampActions, "inspectCharts").name("Inspect Charts");
  rampFolder.add(rampActions, "sceneView").name("Scene View");
  rampFolder.add(rampActions, "fullRange").name("Full Black–White");
  rampFolder.add(rampActions, "darkRange").name("Dark Banding Test");

  const presentationFolder = gui.addFolder("Presentation");
  presentationFolder.add(primitives, "visible").name("Rainbow Materials");
  presentationFolder.add(grid, "visible").name("Ground Grid");
  presentationFolder.close();

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.close();
  cameraFolder.add(camera.position, "x", -50, 50).name("X").listen();
  cameraFolder.add(camera.position, "y", -50, 50).name("Y").listen();
  cameraFolder.add(camera.position, "z", -50, 50).name("Z").listen();

  const lightFolder = gui.addFolder("Lighting");
  lightFolder.close();
  lightFolder.add(directionalLight, "intensity", 0, 6).name("Light Intensity");
  lightFolder.add(ambientLight, "intensity", 0, 2).name("Ambient Intensity");

  return () => {
    gui.destroy();
    scene.remove(grid);
    grid.dispose();
    disposeBackdrop();
    labelTextures.forEach((texture) => texture.dispose());
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
