import GUI from "lil-gui";
import { DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Vector2 } from "three";
import { createGeometryBuffers, GroundGrid, pushMiteredPrism, toBufferGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Mitered Prism",
  description: "A rectangular beam with independently adjustable miters at both ends. " +
    "Set each end angle and adjust the beam dimensions; translucent guides show the cut planes.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x8792a0,
    cameraPosition: [4, 4, 5],
  });
  controls.target.set(0, 0.4, 0);
  controls.update();
  const floor = new GroundGrid({ size: 10 });
  scene.add(floor);
  const cutMaterial = new MeshStandardMaterial({ color: 0x55afd6, roughness: 0.7 });
  const guideMaterial = new MeshBasicMaterial({ color: 0xd8ecf5, transparent: true, opacity: 0.2,
    side: DoubleSide, depthWrite: false });
  const stage = new Group();
  scene.add(stage);
  const params = { nearAngle: 35, farAngle: -35, width: 0.7, height: 0.6, nearCut: true, farCut: true, surfaces: true };

  const clear = () => {
    stage.traverse((object) => { if (object instanceof Mesh) object.geometry.dispose(); });
    stage.clear();
  };
  const rebuild = () => {
    clear();
    const normal = (degrees: number) => new Vector2(Math.cos(degrees * Math.PI / 180), Math.sin(degrees * Math.PI / 180));
    const nearNormal = normal(params.nearAngle);
    const farNormal = normal(params.farAngle);
    const from = new Vector2(-1.8, 0);
    const to = new Vector2(1.8, 0);
    const buffers = createGeometryBuffers();
    pushMiteredPrism(buffers, from, to, params.width, 0.05, 0.05 + params.height,
      params.nearCut ? { wall: nearNormal } : {},
      params.farCut ? { wall: farNormal } : {});
    const beam = new Mesh(toBufferGeometry(buffers), cutMaterial);
    beam.castShadow = true;
    beam.receiveShadow = true;
    stage.add(beam);
    if (params.surfaces) {
      for (const [point, n] of [[from, nearNormal], [to, farNormal]]) {
        const surface = new Mesh(new PlaneGeometry(2, params.height + 0.6), guideMaterial);
        surface.rotation.y = Math.atan2(n.x, n.y);
        surface.position.set(point.x, 0.05 + params.height / 2, point.y);
        stage.add(surface);
      }
    }
  };
  rebuild();
  const gui = new GUI();
  gui.title("Mitered Prism");
  gui.add(params, "nearAngle", -65, 65, 1).name("Near End Angle").onChange(rebuild);
  gui.add(params, "farAngle", -65, 65, 1).name("Far End Angle").onChange(rebuild);
  gui.add(params, "nearCut").name("Cut Near End").onChange(rebuild);
  gui.add(params, "farCut").name("Cut Far End").onChange(rebuild);
  gui.add(params, "width", 0.2, 1, 0.02).name("Width").onChange(rebuild);
  gui.add(params, "height", 0.2, 1.2, 0.02).name("Height").onChange(rebuild);
  gui.add(params, "surfaces").name("Show Surfaces").onChange(rebuild);
  return () => {
    gui.destroy();
    clear();
    cutMaterial.dispose();
    guideMaterial.dispose();
    floor.dispose();
    dispose();
  };
}
