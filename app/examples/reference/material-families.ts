import GUI from "lil-gui";
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusKnotGeometry,
} from "three";
import { createOrthographicScene } from "../../framework/createOrthographicScene";
import { materialStudyLabels, materialStudyLights } from "../../framework/materialStudy";

export const meta = {
  title: "Material Families",
  description:
    "Basic, Lambert, Phong, Standard, and Physical share a shape, base color, orthographic view, and direct lights. Basic is unlit; Lambert adds diffuse lighting; Phong adds a shininess-controlled highlight. Standard uses roughness/metalness PBR; Physical extends it with layers. With Physical clearcoat at zero, Standard and Physical should closely match. Phong shininess is not equivalent to PBR roughness. No environment maps or external assets.",
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, onFrame, dispose } = createOrthographicScene(container, {
    background: 0x10151d,
    frustumSize: 8.4,
    cameraPosition: [0, 0, 30],
    grid: false,
  });
  const gui = new GUI();
  gui.title(meta.title);
  const disposeLights = materialStudyLights(scene, gui);
  const labels = materialStudyLabels(scene);
  const settings = {
    shape: "Sphere",
    color: "#62a6cf",
    roughness: 0.3,
    metalness: 0,
    shininess: 40,
    clearcoat: 0,
    rotate: false,
  };
  const geometries = {
    Sphere: new SphereGeometry(1.15, 48, 32),
    Knot: new TorusKnotGeometry(0.73, 0.25, 120, 20),
    Box: new BoxGeometry(1.7, 1.7, 1.7),
  };
  const basic = new MeshBasicMaterial({ color: settings.color });
  const lambert = new MeshLambertMaterial({ color: settings.color });
  const phong = new MeshPhongMaterial({ color: settings.color, specular: 0x888888, shininess: settings.shininess });
  const standard = new MeshStandardMaterial({
    color: settings.color,
    roughness: settings.roughness,
    metalness: settings.metalness,
  });
  const physical = new MeshPhysicalMaterial({
    color: settings.color,
    roughness: settings.roughness,
    metalness: settings.metalness,
    clearcoat: 0,
    clearcoatRoughness: 0.12,
  });
  const recipes = [
    { name: "Basic", material: basic, note: "Unlit base color", detail: "Unaffected by light intensity" },
    { name: "Lambert", material: lambert, note: "Diffuse lighting", detail: "No specular highlight" },
    { name: "Phong", material: phong, note: "Diffuse + specular", detail: "Highlight controlled by shininess" },
    { name: "Standard", material: standard, note: "Metalness / roughness PBR", detail: "Energy-conserving shading model" },
    { name: "Physical", material: physical, note: "PBR + additional layers", detail: "Try the clearcoat control" },
  ];
  const panelGeometry = new PlaneGeometry(4.8, 5.7);
  const panelMaterial = new MeshBasicMaterial({ color: 0x171f29 });
  const meshes: Mesh[] = [];
  recipes.forEach((recipe, index) => {
    const x = index < 3 ? (index - 1) * 5.2 : (index - 3.5) * 5.2;
    const y = index < 3 ? 3.3 : -3.1;
    const panel = new Mesh(panelGeometry, panelMaterial);
    panel.position.set(x, y - 0.35, -1.5);
    const mesh = new Mesh(geometries.Sphere, recipe.material);
    mesh.position.set(x, y + 0.35, 0);
    mesh.rotation.set(0.2, -0.3, 0);
    meshes.push(mesh);
    scene.add(panel, mesh);
    labels.add(recipe.name, x, y + 2.2, 0.72);
    labels.add(recipe.note, x, y - 1.45, 0.36);
    labels.add(recipe.detail, x, y - 2.1, 0.3);
  });
  const comparison = gui.addFolder("Comparison");
  comparison
    .add(settings, "shape", Object.keys(geometries))
    .name("Shared Shape")
    .onChange((v: keyof typeof geometries) =>
      meshes.forEach((mesh) => {
        mesh.geometry = geometries[v];
      }),
    );
  comparison
    .addColor(settings, "color")
    .name("Base Color")
    .onChange((v: string) => recipes.forEach(({ material }) => material.color.set(v)));
  comparison.add(settings, "rotate").name("Rotate Samples");
  comparison
    .add(
      {
        reset() {
          camera.position.set(0, 0, 30);
          camera.zoom = 1;
          camera.updateProjectionMatrix();
          controls.target.set(0, 0, 0);
          controls.update();
          meshes.forEach((mesh) => mesh.rotation.set(0.2, -0.3, 0));
        },
      },
      "reset",
    )
    .name("Reset View");
  const surface = gui.addFolder("Surface Properties");
  surface
    .add(settings, "shininess", 0, 200, 1)
    .name("Phong Shininess")
    .onChange((v: number) => {
      phong.shininess = v;
    });
  surface
    .add(settings, "roughness", 0, 1, 0.01)
    .name("PBR Roughness")
    .onChange((v: number) => {
      standard.roughness = physical.roughness = v;
    });
  surface
    .add(settings, "metalness", 0, 1, 0.01)
    .name("PBR Metalness")
    .onChange((v: number) => {
      standard.metalness = physical.metalness = v;
    });
  surface
    .add(settings, "clearcoat", 0, 1, 0.01)
    .name("Physical Clearcoat")
    .onChange((v: number) => {
      physical.clearcoat = v;
    });
  onFrame((delta) => {
    if (settings.rotate)
      meshes.forEach((mesh) => {
        mesh.rotation.y += delta * 0.35;
      });
  });
  return () => {
    gui.destroy();
    labels.dispose();
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    recipes.forEach(({ material }) => material.dispose());
    panelGeometry.dispose();
    panelMaterial.dispose();
    disposeLights();
    dispose();
  };
}
