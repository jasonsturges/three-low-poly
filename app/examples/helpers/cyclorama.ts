import GUI from "lil-gui";
import {
  BoxGeometry,
  DirectionalLight,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  WireframeGeometry,
} from "three";
import { Cyclorama } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Cyclorama",
  description:
    "A seamless backdrop — a wall curving into a floor with no visible join. A CYCLORAMA, or an infinity " +
    "cove, or in a photographer's words simply a SWEEP, after the roll of paper it imitates. " +
    "The bend has exactly ONE control, and that is a property of the shape rather than a simplification: " +
    "the corner is always 90°, so a quarter arc is fully determined by its RADIUS. Width, height and depth " +
    "only say where the flats end — none of them touches what the curve does. " +
    "The join disappears because the arc's centre sits at (radius, radius), the only place a circle is " +
    "tangent to BOTH planes at once; there the curve leaves each flat travelling in that flat's own " +
    "direction, so there is no crease to catch light. " +
    "And it is the one place `flatShading` is wrong. Everything else here wants to read as intentionally " +
    "faceted; this wants to read as continuous, and faceting IS seeing the bend. Turn Flat Shading on and " +
    "watch the cove collapse into a fan of bands. Sagitta in the Readout is how deep each facet dips " +
    "inside the true arc — pick Segments against that rather than by eye.",
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x0e1014,
    cameraPosition: [1.4, 1.3, 3.4],
  });

  camera.fov = 32;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0.75, 0.6);
  controls.update();

  // Two lights, because a cyc is lit SEPARATELY from what stands on it — an evenly lit backdrop reads as
  // no background at all, which is the entire point of building one.
  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(1.6, 2.2, 2.4);
  const wash = new DirectionalLight(0xffffff, 0.75);
  wash.position.set(-0.6, 2.6, -1.2);
  scene.add(key, wash);

  const prop = new MeshStandardMaterial({ color: 0xc0663a, roughness: 0.6, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    width: 3,
    height: 1.8,
    depth: 1.8,
    radius: 0.7,
    segments: 12,
    color: "#d8d5d0",
    flatShading: false,
    showProps: true,
    wireframe: false,
    facets: "",
    fit: "",
  };

  const stage = new Group();
  scene.add(stage);
  let backdrop: Cyclorama;

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        if (child !== backdrop) child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const build = () => {
    clear();
    backdrop?.dispose();

    backdrop = new Cyclorama(params);
    // Flat shading is the caller's to get wrong, which is why the toggle lives here rather than in the
    // options — the geometry is indexed and smooth-normalled either way.
    const paper = backdrop.material as MeshStandardMaterial;
    paper.flatShading = params.flatShading;
    paper.needsUpdate = true;
    stage.add(backdrop);

    if (params.wireframe) {
      stage.add(new LineSegments(new WireframeGeometry(backdrop.geometry), wire));
    }

    if (params.showProps) {
      // Something to stand on it. The test of a cyclorama is that your eye goes to these and never finds
      // the horizon behind them.
      const box = new Mesh(new BoxGeometry(0.34, 0.34, 0.34), prop);
      box.position.set(-0.42, 0.17, 0.85);
      const ball = new Mesh(new SphereGeometry(0.2, 16, 12), prop);
      ball.position.set(0.34, 0.2, 1.05);
      stage.add(box, ball);
    }

    params.facets = `${Math.round(params.segments)} facets of ${(90 / Math.max(1, Math.round(params.segments))).toFixed(1)}° · sagitta ${backdrop.sagitta.toFixed(5)}`;
    params.fit =
      Math.abs(backdrop.radius - params.radius) < 1e-9
        ? `radius ${backdrop.radius.toFixed(2)} — fits`
        : `radius clamped ${params.radius.toFixed(2)} → ${backdrop.radius.toFixed(2)} (cannot exceed height or depth)`;
  };
  build();

  const gui = new GUI();
  gui.title("Cyclorama");

  const cove = gui.addFolder("Cove");
  // THE control, and the only one the bend has. A quarter arc is fully determined by its radius — there is
  // no span or angle to give, because the angle is always 90°.
  cove.add(params, "radius", 0.05, 2, 0.01).name("Radius").onChange(build);
  // Not a style knob here. Judge it by the sagitta in the Readout against how close the camera gets.
  cove.add(params, "segments", 1, 48, 1).name("Segments").onChange(build);
  cove.open();

  const sheet = gui.addFolder("Sheet");
  // Where the flats END. Neither touches what the curve does.
  sheet.add(params, "height", 0.2, 4, 0.05).name("Height").onChange(build);
  sheet.add(params, "depth", 0.2, 4, 0.05).name("Depth").onChange(build);
  sheet.add(params, "width", 0.5, 8, 0.1).name("Width").onChange(build);
  sheet.open();

  const look = gui.addFolder("Look");
  look.addColor(params, "color").name("Color").onChange(build);
  // The gotcha, made reachable. Smooth reads as one surface; flat shows every facet, which is the one
  // thing a cyclorama must not do.
  look.add(params, "flatShading").name("Flat Shading").onChange(build);
  look.add(params, "showProps").name("Show Props").onChange(build);
  look.add(params, "wireframe").name("Wireframe").onChange(build);
  look.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "facets").name("Facets").listen().disable();
  readout.add(params, "fit").name("Fit").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    backdrop?.dispose();
    prop.dispose();
    wire.dispose();
    dispose();
  };
}
