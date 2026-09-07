import GUI from "lil-gui";
import {
  DirectionalLight,
  ExtrudeGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  WireframeGeometry,
} from "three";
import { StrapHingeShape, type StrapHingeShapeOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = {
  title: "Strap Hinge",
  description:
    "A tapered strap drawn from a straight pin edge to a point. Length and width set its proportions; " +
    "sweep controls the inward curve of its sides. Extrusion adds thickness to the 2D shape.",
};

export default function (container: HTMLElement) {
  const handle = createScene(container, { cameraPosition: [0.7, 0.35, 3] });
  const { scene, dispose } = handle;
  const disposeBackdrop = gradientBackdrop(scene);

  const fill = new DirectionalLight(0xffffff, 1.5);
  fill.position.set(0, 1, 4);
  scene.add(fill);

  const params: Required<StrapHingeShapeOptions> & { depth: number; curveSegments: number } = {
    length: 0.85,
    width: 0.22,
    sweep: 0.28,
    depth: 0.035,
    curveSegments: 24,
  };
  const appearance = { color: "#8d949e" };
  const material = new MeshStandardMaterial({
    color: appearance.color,
    metalness: 0.4,
    roughness: 0.5,
    flatShading: true,
    // Offset the solid so the wire overlay passes the depth test without flickering.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const createGeometry = () =>
    new ExtrudeGeometry(new StrapHingeShape(params), {
      depth: params.depth,
      curveSegments: params.curveSegments,
      steps: 1,
      bevelEnabled: false,
    });

  // Keep the shape's local frame: the pin edge is at X=0 and the tip reaches +X.
  const strap = new Mesh(createGeometry(), material);
  const wireMaterial = new LineBasicMaterial({ color: 0x00e5ff });
  const wireframe = new LineSegments(new WireframeGeometry(strap.geometry), wireMaterial);
  wireframe.visible = false;
  strap.add(wireframe);
  scene.add(strap);
  frameObject(handle, strap, { fit: 1.6 });

  const rebuild = () => {
    strap.geometry.dispose();
    strap.geometry = createGeometry();
    wireframe.geometry.dispose();
    wireframe.geometry = new WireframeGeometry(strap.geometry);
  };

  const gui = new GUI();
  gui.title("Strap Hinge");
  gui.add(params, "length", 0.2, 2, 0.01).name("Length").onChange(rebuild);
  gui.add(params, "width", 0.05, 0.8, 0.01).name("Width").onChange(rebuild);
  gui.add(params, "sweep", 0, 1, 0.01).name("Sweep").onChange(rebuild);

  const extrusion = gui.addFolder("Extrusion");
  extrusion.add(params, "depth", 0.005, 0.2, 0.005).name("Depth").onChange(rebuild);
  extrusion.add(params, "curveSegments", 1, 48, 1).name("Curve Segments").onChange(rebuild);

  const surface = gui.addFolder("Material");
  surface
    .addColor(appearance, "color")
    .name("Color")
    .onChange(() => material.color.set(appearance.color));
  surface.add(material, "metalness", 0, 1, 0.01).name("Metalness");
  surface.add(material, "roughness", 0, 1, 0.01).name("Roughness");
  surface.add(wireframe, "visible").name("Wireframe Overlay");

  gui.add({ frame: () => frameObject(handle, strap, { fit: 1.6 }) }, "frame").name("Frame Shape");

  return () => {
    gui.destroy();
    strap.geometry.dispose();
    wireframe.geometry.dispose();
    wireMaterial.dispose();
    material.dispose();
    scene.remove(fill);
    fill.dispose();
    disposeBackdrop();
    dispose();
  };
}
