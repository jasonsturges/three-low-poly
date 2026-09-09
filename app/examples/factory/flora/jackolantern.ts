import GUI from "lil-gui";
import { CylinderGeometry, DirectionalLight, Mesh, MeshStandardMaterial, PointLight } from "three";
import { GroundGrid, JackOLanternGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = {
  title: "Jack-o’-lantern",
  description:
    "A shell built with openings: triangulate a flat pattern, subdivide, wrap onto a ribbed sphere, then bridge to an inner skin. No CSG or additional dependencies. Face points live in longitude/latitude space; thickness is a concentric scale, not a constant normal offset.",
};

export default function (container: HTMLElement) {
  const { scene, controls, onFrame, dispose } = createScene(container, {
    cameraPosition: [1.25, 1.55, 3.1],
  });
  const disposeBackdrop = gradientBackdrop(scene);
  const keyLight = new DirectionalLight("#ffe0be", 1.8);
  keyLight.position.set(-3, 5, 4);
  scene.add(keyLight);
  controls.target.set(0, 0.9, 0);
  controls.update();
  const params = {
    rindThickness: 0.13,
    rindSquash: 0.82,
    rindRibs: 8,
    rindRibDepth: 0.075,
    faceScale: 1,
    rindSubdivisions: 4,
    wireframe: false,
    glow: true,
  };
  const rind = new MeshStandardMaterial({ color: "#c85a16", roughness: 0.85, flatShading: true });
  const inside = new MeshStandardMaterial({ color: "#d88c35", roughness: 1, flatShading: true });
  const cut = new MeshStandardMaterial({ color: "#ffc66c", roughness: 0.85, flatShading: true });
  const stemMaterial = new MeshStandardMaterial({ color: "#474d28", roughness: 1, flatShading: true });
  const shell = new Mesh(new JackOLanternGeometry({ ...params, stemLean: 0.22 }), [rind, inside, cut, stemMaterial]);
  // Avoid shadow-map self-acne on the thin cut edges. The shell still
  // casts real shadows through the openings onto the floor.
  shell.castShadow = true;
  shell.receiveShadow = false;
  scene.add(shell);
  // Presentation only: the library geometry contains the carved rind and stem, with no light.
  const candleMaterial = new MeshStandardMaterial({ color: "#fff0bf", emissive: "#ff992d", emissiveIntensity: 1 });
  const candle = new Mesh(new CylinderGeometry(0.11, 0.12, 0.27, 12), candleMaterial);
  candle.position.y = 0.3;
  shell.add(candle);
  const light = new PointLight("#ffae48", 5, 6, 2);
  light.position.set(0, 0.65, 0.05);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.camera.near = 0.05;
  light.shadow.bias = -0.0002;
  shell.add(light);

  const grid = new GroundGrid({ size: 10, divisions: 10, planeColor: 0x0f141b });
  scene.add(grid);

  const stats = { triangles: shell.geometry.getAttribute("position").count / 3 };
  const rebuild = () => {
    const geometry = new JackOLanternGeometry({ ...params, stemLean: 0.22 });
    shell.geometry.dispose();
    shell.geometry = geometry;
    stats.triangles = geometry.getAttribute("position").count / 3;
  };
  const gui = new GUI();
  gui.title("Jack-o’-lantern");
  const shape = gui.addFolder("Shell");
  shape.add(params, "rindThickness", 0.06, 0.24, 0.01).name("Rind thickness").onChange(rebuild);
  shape.add(params, "rindSquash", 0.65, 1, 0.01).name("Height").onChange(rebuild);
  shape.add(params, "rindRibs", 4, 12, 1).name("Ribs").onChange(rebuild);
  shape.add(params, "rindRibDepth", 0, 0.12, 0.005).name("Rib depth").onChange(rebuild);
  shape.add(params, "faceScale", 0.7, 1.2, 0.05).name("Face size").onChange(rebuild);
  const view = gui.addFolder("Inspect");
  view.add(params, "rindSubdivisions", 2, 4, 1).name("Subdivisions").onChange(rebuild);
  view
    .add(params, "wireframe")
    .name("Wireframe")
    .onChange((value: boolean) => {
      for (const material of [rind, inside, cut]) material.wireframe = value;
    });
  view
    .add(params, "glow")
    .name("Candle light")
    .onChange((value: boolean) => {
      light.visible = value;
      candleMaterial.emissiveIntensity = value ? 1 : 0;
    });
  view.add(stats, "triangles").name("Total triangles").listen().disable();
  let elapsed = 0;
  const stop = onFrame((delta) => {
    elapsed += delta;
    light.intensity = 5 + 0.3 * Math.sin(elapsed * 7) + 0.15 * Math.sin(elapsed * 13);
  });
  return () => {
    stop();
    gui.destroy();
    shell.geometry.dispose();
    candle.geometry.dispose();
    grid.dispose();
    disposeBackdrop();
    for (const material of [rind, inside, cut, stemMaterial, candleMaterial]) material.dispose();
    light.dispose();
    dispose();
  };
}
