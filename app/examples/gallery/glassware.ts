import { Box3, DirectionalLight, Group, LatheGeometry, Mesh, MeshPhysicalMaterial, Sprite, Vector2 } from "three";
import {
  BeakerGeometry,
  ErlenmeyerFlaskGeometry,
  FlorenceFlaskStand,
  GraduatedCylinderGeometry,
  GroundGrid,
  PipetteGeometry,
  TestTubeGeometry,
  createLinearGradientTexture,
  createLiquidFill,
} from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";
import { frameObject } from "../../framework/frameObject";

export const meta = { title: "Glassware" };

export default function (container: HTMLElement) {
  const handle = createScene(container);
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

  // A cool back-rim light to catch the glass edges against the dark.
  const rim = new DirectionalLight(0xaad2f0, 0.7);
  rim.position.set(5, 7, -9);
  scene.add(rim);

  const grid = new GroundGrid({ size: 20, planeColor: 0x0f141b });
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
  const fillFor = (color: number) => ({ fill: 0.5, color, opacity: 0.9, glow: 0.75, inset: 0.06 });

  type VesselGeometry = LatheGeometry & { profile: Vector2[]; height: number };
  type Spec =
    | { kind: "glass"; label: string; geometry: VesselGeometry; color: number }
    | { kind: "stand"; label: string; color: number };

  const specs: Spec[] = [
    { kind: "glass", label: "Beaker", geometry: new BeakerGeometry({ radius: 0.6, height: 1.4, spout: 0.3, radialSegments: 48 }), color: 0x4bd0b0 },
    { kind: "glass", label: "Erlenmeyer Flask", geometry: new ErlenmeyerFlaskGeometry({ bodyRadius: 0.6, neckRadius: 0.2, bodyHeight: 1.3, neckHeight: 0.6, radialSegments: seg }), color: 0xe06bb0 },
    { kind: "stand", label: "Florence Flask", color: 0x8a7cf0 },
    { kind: "glass", label: "Graduated Cylinder", geometry: new GraduatedCylinderGeometry({ radius: 0.28, height: 2.4, radialSegments: seg }), color: 0x5ea8f0 },
    { kind: "glass", label: "Test Tube", geometry: new TestTubeGeometry({ radius: 0.28, height: 2.0, radialSegments: seg }), color: 0x7bd66a },
    { kind: "glass", label: "Pipette", geometry: new PipetteGeometry({ radius: 0.09, height: 2.6, tipLength: 0.6, radialSegments: seg }), color: 0xe0913c },
  ];

  const content = new Group();
  const pitch = 2.5;

  specs.forEach((spec, i) => {
    const vessel = new Group();
    vessel.position.x = (i - (specs.length - 1) / 2) * pitch;

    let topY: number;
    if (spec.kind === "stand") {
      const stand = new FlorenceFlaskStand({
        flask: { bodyRadius: 0.5, neckRadius: 0.13, neckHeight: 0.9, radialSegments: seg },
        fill: fillFor(spec.color),
        glassMaterial: glass,
      });
      vessel.add(stand);
      topY = new Box3().setFromObject(stand).max.y;
    } else {
      const shell = new Mesh(spec.geometry, glass);
      shell.renderOrder = 1;
      shell.castShadow = true;
      vessel.add(shell);
      const liquid = createLiquidFill(spec.geometry.profile, fillFor(spec.color), seg);
      if (liquid) vessel.add(liquid);
      topY = spec.geometry.height;
    }

    const label = createTextSprite(spec.label, { scale: 0.3, color: "#e8eef4", y: topY + 0.55 });
    vessel.add(label);
    content.add(vessel);
  });

  scene.add(content);
  frameObject(handle, content);

  return () => {
    grid.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    content.traverse((o) => {
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
    glass.dispose();
    background.dispose();
    dispose();
  };
}
