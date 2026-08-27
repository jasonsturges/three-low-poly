import GUI from "lil-gui";
import { Box3, DirectionalLight, Group, LatheGeometry, Mesh, MeshPhysicalMaterial, Sprite, Vector2 } from "three";
import {
  ApothecaryJar,
  BeakerGeometry,
  ErlenmeyerFlaskGeometry,
  FlorenceFlaskStand,
  GraduatedCylinderGeometry,
  GroundGrid,
  PipetteGeometry,
  PotionBottle,
  TestTubeGeometry,
  WineBottle,
  createLinearGradientTexture,
  createLiquidFill,
  type FillOptions,
} from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";
import { frameObject } from "../../framework/frameObject";

export const meta = { title: "Glassware" };

export default function (container: HTMLElement) {
  const handle = createScene(container, { cameraPosition: [7, 5, 16] });
  const { scene, dispose } = handle;

  // A moody vertical wash — slate at the floor, near-black overhead. Transmission glass refracts it, so the
  // vessels read as glass instead of vanishing against flat black.
  const background = createLinearGradientTexture({
    stops: [
      { offset: 0, color: 0x28323f }, // bottom of the view
      { offset: 1, color: 0x0c1016 }, // top
    ],
  });
  scene.background = background;

  const rim = new DirectionalLight(0xaad2f0, 0.7);
  rim.position.set(5, 7, -9);
  scene.add(rim);

  const grid = new GroundGrid({ size: 28, planeColor: 0x0f141b });
  scene.add(grid);

  // One shared glass; the glowing liquids carry the colour.
  const glass = new MeshPhysicalMaterial({
    color: 0x9fdfff,
    transparent: true,
    opacity: 0.38,
    roughness: 0.07,
    metalness: 0,
    transmission: 0.92,
    ior: 1.5,
  });

  const seg = 24;
  const params = { fill: 0.5 };
  // One Fill dial drives every vessel; at 0 there is no liquid mesh, so the bare glass shows alone.
  const fillFor = (color: number): FillOptions | undefined =>
    params.fill > 0 ? { fill: params.fill, color, opacity: 0.9, glow: 0.7, inset: 0.06 } : undefined;

  type VesselGeometry = LatheGeometry & { profile: Vector2[]; height: number };
  const glassVessel = (geometry: VesselGeometry, color: number): Group => {
    const g = new Group();
    const shell = new Mesh(geometry, glass);
    shell.renderOrder = 1;
    shell.castShadow = true;
    g.add(shell);
    const opts = fillFor(color);
    if (opts) {
      const liquid = createLiquidFill(geometry.profile, opts, seg);
      if (liquid) g.add(liquid);
    }
    return g;
  };

  const specs: { label: string; make: () => Group }[] = [
    { label: "Beaker", make: () => glassVessel(new BeakerGeometry({ radius: 0.6, height: 1.4, spout: 0.3, radialSegments: 48 }), 0x4bd0b0) },
    { label: "Erlenmeyer Flask", make: () => glassVessel(new ErlenmeyerFlaskGeometry({ bodyRadius: 0.6, neckRadius: 0.2, bodyHeight: 1.3, neckHeight: 0.6, radialSegments: seg }), 0xe06bb0) },
    { label: "Florence Flask", make: () => new FlorenceFlaskStand({ flask: { bodyRadius: 0.5, neckRadius: 0.13, neckHeight: 0.9, radialSegments: seg }, fill: fillFor(0x8a7cf0), glassMaterial: glass }) },
    { label: "Graduated Cylinder", make: () => glassVessel(new GraduatedCylinderGeometry({ radius: 0.28, height: 2.4, radialSegments: seg }), 0x5ea8f0) },
    { label: "Test Tube", make: () => glassVessel(new TestTubeGeometry({ radius: 0.28, height: 2.0, radialSegments: seg }), 0x7bd66a) },
    { label: "Pipette", make: () => glassVessel(new PipetteGeometry({ radius: 0.09, height: 2.6, tipLength: 0.6, radialSegments: seg }), 0xe0913c) },
    { label: "Apothecary Jar", make: () => new ApothecaryJar({ jar: { radius: 0.7, neckRadius: 0.28, height: 1.9, radialSegments: seg }, fill: fillFor(0x6ac06a), glassMaterial: glass }) },
    { label: "Potion Bottle", make: () => new PotionBottle({ bottle: { radius: 0.55, neckRadius: 0.22, height: 1.7, radialSegments: seg }, fill: fillFor(0xc23bd6), glassMaterial: glass }) },
    { label: "Wine Bottle", make: () => new WineBottle({ bottle: { radius: 0.33, neckRadius: 0.13, height: 2.4, radialSegments: seg }, fill: fillFor(0x7a1f2b), glassMaterial: glass }) },
  ];

  const pitch = 2.3;
  const buildContent = (): Group => {
    const root = new Group();
    specs.forEach((spec, i) => {
      const vessel = new Group();
      vessel.position.x = (i - (specs.length - 1) / 2) * pitch;

      const object = spec.make();
      vessel.add(object);

      const topY = new Box3().setFromObject(object).max.y;
      vessel.add(createTextSprite(spec.label, { scale: 0.28, color: "#e8eef4", y: topY + 0.5 }));

      root.add(vessel);
    });
    return root;
  };

  const disposeContent = (root: Group) =>
    root.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        if (o.material !== glass) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      } else if (o instanceof Sprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });

  let content = buildContent();
  scene.add(content);
  frameObject(handle, content);

  const gui = new GUI();
  gui.title("Glassware");
  // Rebuild the liquids only; keep the viewer's framing (no re-frame).
  gui.add(params, "fill", 0, 1, 0.01).name("Fill").onChange(() => {
    scene.remove(content);
    disposeContent(content);
    content = buildContent();
    scene.add(content);
  });

  return () => {
    gui.destroy();
    grid.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    disposeContent(content);
    glass.dispose();
    background.dispose();
    dispose();
  };
}
