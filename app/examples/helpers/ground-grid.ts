import GUI from "lil-gui";
import { Mesh, MeshStandardMaterial, TorusKnotGeometry } from "three";
import { GroundGrid } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Ground Grid",
  description:
    "Reference floor: a shadow-receiving plane and a coplanar grid that do not z-fight. " +
    "Turn off Polygon Offset and watch the lines tear.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, {
    background: 0x0e1418,
    cameraPosition: [7, 4, 9],
  });

  const params = {
    size: 24,
    divisions: 24,
    planeColor: 0x1a2430,
    gridColor: 0x223344,
    centerColor: 0x334455,
    y: 0,
    polygonOffset: true,
    visible: true,
  };

  let floor = new GroundGrid(params);
  scene.add(floor);

  // Something to cast a shadow, so the floor has a job to do.
  const knot = new Mesh(
    new TorusKnotGeometry(0.9, 0.3, 96, 12),
    new MeshStandardMaterial({ color: 0xc45a3a, roughness: 0.6, flatShading: true }),
  );
  knot.position.y = 1.6;
  knot.castShadow = true;
  scene.add(knot);

  const rebuild = () => {
    scene.remove(floor);
    floor.dispose();

    floor = new GroundGrid(params);
    floor.visible = params.visible;

    // The whole point of the helper, exposed so you can turn it OFF. With polygon offset the plane's
    // fill is biased back in the depth buffer while the lines stay put, so the two are coplanar and
    // stable. Without it, the grid and the plane round to the same depth, neither reliably wins, and
    // the lines tear and shimmer as the camera moves — worst at grazing angles. Orbit low and toggle.
    floor.plane.material.polygonOffset = params.polygonOffset;
    floor.plane.material.needsUpdate = true;

    scene.add(floor);
  };

  const gui = new GUI();
  gui.title("Ground Grid");

  // Leave this off, orbit until the camera is nearly level with the floor, and the tearing is obvious.
  gui.add(params, "polygonOffset").name("Polygon Offset").onChange(rebuild);
  gui.add(params, "visible").name("Visible").onChange(rebuild);

  const layout = gui.addFolder("Layout");
  layout.add(params, "size", 4, 64, 1).name("Size").onChange(rebuild);
  // Divisions are independent of size: 24/6 gives four world units per cell.
  layout.add(params, "divisions", 1, 64, 1).name("Divisions").onChange(rebuild);
  layout.add(params, "y", -2, 2, 0.05).name("Height").onChange(rebuild);
  layout.open();

  const color = gui.addFolder("Color");
  color.addColor(params, "planeColor").name("Plane").onChange(rebuild);
  color.addColor(params, "gridColor").name("Grid").onChange(rebuild);
  color.addColor(params, "centerColor").name("Center Lines").onChange(rebuild);

  return () => {
    gui.destroy();
    floor.dispose();
    knot.geometry.dispose();
    knot.material.dispose();
    dispose();
  };
}
