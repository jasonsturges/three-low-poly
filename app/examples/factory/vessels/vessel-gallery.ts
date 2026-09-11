import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  SphereGeometry,
  Sprite,
  Vector2,
  Vector3,
} from "three";
import {
  ApothecaryJar,
  BeakerGeometry,
  ErlenmeyerFlaskGeometry,
  FlorenceFlaskGeometry,
  GraduatedCylinderGeometry,
  PipetteGeometry,
  PotionBottle,
  TestTubeGeometry,
  WineBottle,
  createLiquidFill,
  fillProfile,
  type FillOptions,
} from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";
import { createTextSprite } from "../../../framework/createTextSprite";
import { clearDefaultLights } from "../../../framework/clearDefaultLights";

export const meta = {
  title: "Vessel Gallery",
  description:
    "Nine vessels arranged as profile-and-object pairs at a common scale. Cyan traces each geometry's source silhouette (radius right, height up); colored lines show fillProfile using the same fill and inset as the liquid mesh. Fill is a fraction of height, not volume. The silhouette excludes rolled rims, wall thickness, and the beaker's spout, which is added after revolving. Corks remain visible on the assembled bottles and jar. Select a vessel to inspect it alone.",
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createOrthographicScene(container, {
    background: 0x141b24,
    frustumSize: 7,
    cameraPosition: [0, 1.5, 20],
    grid: false,
  });
  clearDefaultLights(scene);
  scene.add(new HemisphereLight(0xcddff5, 0x514236, 1.5));
  const key = new DirectionalLight(0xffffff, 3);
  key.position.set(-3, 4, 6);
  const rim = new DirectionalLight(0x9fdfff, 1.5);
  rim.position.set(4, 2, -3);
  scene.add(key, rim);
  const glass = new MeshPhysicalMaterial({
    color: 0xbfe4ee,
    transparent: true,
    opacity: 0.3,
    roughness: 0.12,
    transmission: 0.15,
    metalness: 0,
    depthWrite: false,
  });
  const cyan = new LineBasicMaterial({ color: 0x72d9ed });
  const guide = new LineBasicMaterial({ color: 0x293646, depthWrite: false });
  const amber = new MeshBasicMaterial({ color: 0xffbb66 });
  const seg = 24;
  const params = { fill: 0.5, lineup: true, vessel: "Beaker", showPoints: true, showFillProfile: true };
  const INSET = 0.06;
  // Factories and the 2D fill overlay receive exactly the same fill settings.
  const fillFor = (color: number): FillOptions | undefined =>
    params.fill > 0 ? { fill: params.fill, color, opacity: 0.9, glow: 0.3, inset: INSET } : undefined;
  type VesselGeometry = LatheGeometry & { profile: Vector2[]; height: number };
  const glassVessel = (geometry: VesselGeometry, color: number): Group => {
    const group = new Group();
    const shell = new Mesh(geometry, glass);
    shell.renderOrder = 1;
    group.add(shell);
    const options = fillFor(color);
    if (options) {
      const liquid = createLiquidFill(geometry.profile, options, seg);
      if (liquid) group.add(liquid);
    }
    return group;
  };
  const specs: { label: string; make: () => Group }[] = [
    {
      label: "Beaker",
      make: () => glassVessel(new BeakerGeometry({ radius: 0.6, height: 1.4, spout: 0.3, radialSegments: 48 }), 0x4bd0b0),
    },
    {
      label: "Erlenmeyer Flask",
      make: () =>
        glassVessel(
          new ErlenmeyerFlaskGeometry({
            bodyRadius: 0.6,
            neckRadius: 0.2,
            bodyHeight: 1.3,
            neckHeight: 0.6,
            radialSegments: seg,
          }),
          0xe06bb0,
        ),
    },
    {
      label: "Florence Flask",
      make: () =>
        glassVessel(
          new FlorenceFlaskGeometry({ bodyRadius: 0.5, neckRadius: 0.13, neckHeight: 0.9, radialSegments: seg }),
          0x8a7cf0,
        ),
    },
    {
      label: "Graduated Cylinder",
      make: () => glassVessel(new GraduatedCylinderGeometry({ radius: 0.28, height: 2.4, radialSegments: seg }), 0x5ea8f0),
    },
    {
      label: "Test Tube",
      make: () => glassVessel(new TestTubeGeometry({ radius: 0.28, height: 2.0, radialSegments: seg }), 0x7bd66a),
    },
    {
      label: "Pipette",
      make: () => glassVessel(new PipetteGeometry({ radius: 0.09, height: 2.6, tipLength: 0.6, radialSegments: seg }), 0xe0913c),
    },
    {
      label: "Apothecary Jar",
      make: () =>
        new ApothecaryJar({
          jar: { radius: 0.7, neckRadius: 0.28, height: 1.9, radialSegments: seg },
          fill: fillFor(0x6ac06a),
          glassMaterial: glass,
        }),
    },
    {
      label: "Potion Bottle",
      make: () =>
        new PotionBottle({
          bottle: { radius: 0.55, neckRadius: 0.22, height: 1.7, radialSegments: seg },
          fill: fillFor(0xc23bd6),
          glassMaterial: glass,
        }),
    },
    {
      label: "Wine Bottle",
      make: () =>
        new WineBottle({
          bottle: { radius: 0.33, neckRadius: 0.13, height: 2.4, radialSegments: seg },
          fill: fillFor(0x7a1f2b),
          glassMaterial: glass,
        }),
    },
  ];

  const stage = new Group();
  scene.add(stage);
  const dynamicLines: LineBasicMaterial[] = [];
  function clear() {
    stage.traverse((object) => {
      if (object instanceof Mesh || object instanceof Line) object.geometry.dispose();
      if (object instanceof InstancedMesh) object.dispose();
      if (object instanceof Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material !== glass && material !== amber) material.dispose();
        });
      }
      if (object instanceof Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    dynamicLines.forEach((m) => m.dispose());
    dynamicLines.length = 0;
    stage.clear();
  }
  function label(text: string, x: number, y: number, scale = 0.3, color = "#e5edf5") {
    stage.add(createTextSprite(text, { size: 64, scale, x, y, z: 0.8, color }));
  }
  function line(points: Vector3[], material: LineBasicMaterial) {
    stage.add(new Line(new BufferGeometry().setFromPoints(points), material));
  }
  let viewWidth = 12;
  let viewHeight = 12;
  let centerY = 0;
  function rebuild() {
    clear();
    const entries = params.lineup ? specs : specs.filter((spec) => spec.label === params.vessel);
    const columns = Math.min(3, entries.length);
    const rows = Math.ceil(entries.length / columns);
    const pitchX = 3.8;
    const pitchY = 3.7;
    // Reserve room for the shared-scale legend even when inspecting one vessel in a narrow viewport.
    viewWidth = Math.max(columns * pitchX, 6.4);
    viewHeight = rows * pitchY + 0.7;
    centerY = 1.2;
    entries.forEach((spec, index) => {
      const x = ((index % columns) - (columns - 1) / 2) * pitchX;
      const y = ((rows - 1) / 2 - Math.floor(index / columns)) * pitchY;
      const object = spec.make();
      // Read the actual glass shell, retaining its local transform.
      // Material identity distinguishes the glass from corks and liquid meshes.
      const shells: Mesh<VesselGeometry>[] = [];
      object.traverse((child) => {
        if (
          child instanceof Mesh &&
          child.material === glass &&
          child.geometry instanceof LatheGeometry &&
          "profile" in child.geometry
        )
          shells.push(child as Mesh<VesselGeometry>);
      });
      const shell = shells[0];
      if (!shell) throw new Error(`Missing source profile for ${spec.label}`);
      object.updateMatrixWorld(true);
      const transform = shell.matrixWorld.clone();
      const profile = shell.geometry.profile;
      const chartX = x - 1.12;
      const chartPoint = (p: Vector2, z = 0.02) => {
        const transformed = new Vector3(p.x, p.y, 0).applyMatrix4(transform);
        return new Vector3(chartX + transformed.x, y + transformed.y, z);
      };
      const points = profile.map((p) => chartPoint(p));
      // Shared radius/height guides keep the relative dimensions of all nine vessels visible.
      line([new Vector3(chartX, y, 0), new Vector3(chartX, y + 2.8, 0)], guide);
      line([new Vector3(chartX, y, 0), new Vector3(chartX + 0.85, y, 0)], guide);
      line(points, cyan);
      if (params.showPoints) {
        const markers = new InstancedMesh(new SphereGeometry(0.022, 8, 6), amber, points.length);
        points.forEach((p, i) => markers.setMatrixAt(i, new Matrix4().makeTranslation(p.x, p.y, 0.055)));
        markers.instanceMatrix.needsUpdate = true;
        stage.add(markers);
      }
      if (params.showFillProfile && params.fill > 0) {
        // The liquid itself supplies its color; fillProfile supplies the contour used by its lathe.
        const liquid = object.children.find(
          (child) => child instanceof Mesh && child.renderOrder === 0 && "fillHeight" in child.geometry,
        );
        const color =
          liquid instanceof Mesh && "color" in liquid.material ? (liquid.material as MeshBasicMaterial).color : 0xffbb66;
        const material = new LineBasicMaterial({ color });
        dynamicLines.push(material);
        const fill = fillProfile(profile, params.fill, INSET).map((p) => chartPoint(p, 0.04));
        if (fill.length) line([...fill, fill[0]!], material);
      }
      object.position.set(x + 0.65, y, 0);
      stage.add(object);
      label(spec.label, x, y + 2.85, 0.44);
      label("Profile + fill", x - 0.75, y - 0.27, 0.28, "#72d9ed");
      label("Vessel", x + 0.65, y - 0.27, 0.28);
      line([new Vector3(x - pitchX / 2 + 0.1, y - 0.52, -0.1), new Vector3(x + pitchX / 2 - 0.1, y - 0.52, -0.1)], guide);
    });
    label(
      "Radius → · height ↑ · shared scale · Fill follows height, not volume",
      0,
      centerY - viewHeight / 2 + 0.05,
      0.26,
      "#9cabbc",
    );
  }
  function resetView() {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    camera.zoom = Math.min(14 / viewHeight, (14 * aspect) / viewWidth) * 0.9;
    camera.position.set(0, centerY, 20);
    camera.updateProjectionMatrix();
    controls.target.set(0, centerY, 0);
    controls.update();
  }
  const gui = new GUI();
  gui.title(meta.title);
  if (container.clientWidth < 900) gui.close();
  gui.add(params, "fill", 0, 1, 0.01).name("Fill Height").onChange(rebuild);
  const view = gui.addFolder("View");
  view
    .add(params, "lineup")
    .name("Show All")
    .listen()
    .onChange(() => {
      rebuild();
      resetView();
    });
  view
    .add(
      params,
      "vessel",
      specs.map((s) => s.label),
    )
    .name("Vessel")
    .onChange(() => {
      params.lineup = false;
      rebuild();
      resetView();
    });
  view.add(params, "showPoints").name("Profile Points").onChange(rebuild);
  view.add(params, "showFillProfile").name("Fill Profile").onChange(rebuild);
  view.add({ resetView }, "resetView").name("Reset View");
  rebuild();
  const observer = new ResizeObserver(resetView);
  observer.observe(container);
  resetView();
  return () => {
    observer.disconnect();
    gui.destroy();
    clear();
    [glass, cyan, guide, amber].forEach((material) => material.dispose());
    dispose();
  };
}
