import GUI from "lil-gui";
import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Sprite } from "three";
import { ArchedSlabShape, ArchStyle, GroundGrid } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";

export const meta = {
  title: "Arch Profiles",
  description:
    "The named arches — square, semicircle, segmental, horseshoe, elliptical, pointed, ogee. " +
    "One vocabulary, shared by doors, doorways, windows and headstones.",
};

// Grouped by family, not alphabetically. `segmental`, `semicircle` and `horseshoe` are the SAME circle —
// only the rise moves its center — so they stand together, and at a high rise you can see two of them
// render identically. That is the taxonomy telling the truth, not a bug.
const STYLES: ArchStyle[] = ["square", "segmental", "semicircle", "horseshoe", "elliptical", "pointed", "ogee"];

const SPACING = 1.5;

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x1e242b,
    cameraPosition: [0, 2.4, 9],
  });

  controls.target.set(0, 1.1, 0);
  controls.update();

  const floor = new GroundGrid({ size: 14 });
  scene.add(floor);

  const params = {
    // Above half the span (0.5), so each style shows its character. Drag it DOWN to exactly half and every
    // curved arch converges on the same semicircle — the whole taxonomy in one gesture.
    rise: 0.8,
    width: 1,
    height: 1,
    curveSegments: 24,
  };

  const stone = new MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.9, flatShading: true });

  let row = new Group();

  // A Sprite shares ONE global geometry across every sprite in Three, so disposing it here would tear the
  // rug out from under every other sprite in the app. Its texture and material are its own; the geometry
  // is not ours to free.
  const disposeRow = () => {
    for (const child of row.children) {
      if (child instanceof Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
      } else {
        (child as Mesh).geometry.dispose();
      }
    }
  };

  const rebuild = () => {
    disposeRow();
    scene.remove(row);

    row = new Group();

    STYLES.forEach((style, i) => {
      // Every style is handed the SAME rise. The library clamps each name into its own regime — a
      // `segmental` can never rise past the semicircle, a `horseshoe` can never fall below it — so a style
      // always renders as the thing it is named, whatever rise it is given.
      const slab = new ArchedSlabShape({
        width: params.width,
        height: params.height,
        archHeight: params.rise,
        arch: style,
      });

      const mesh = new Mesh(
        new ExtrudeGeometry(slab, {
          depth: 0.14,
          bevelEnabled: false,
          curveSegments: params.curveSegments,
        }),
        stone,
      );
      const x = (i - (STYLES.length - 1) / 2) * SPACING;
      mesh.position.x = x;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      row.add(mesh);

      // Name each arch under its own slab. A key in the GUI would make you count along the row and map it
      // back — the label belongs on the thing.
      row.add(createTextSprite(style, { x, y: -0.28, z: 0.1, scale: 0.26, color: "#c8d2dd" }));
    });

    scene.add(row);
  };

  rebuild();

  const gui = new GUI();
  gui.title("Arch Profiles");

  // The control that matters, and it always bites. Drag it to half the span and watch the whole row
  // converge on one semicircle; push it past half and each style shows what it actually is.
  gui.add(params, "rise", 0.05, 1.4, 0.01).name("Rise").onChange(rebuild);
  gui.add(params, "width", 0.5, 1.4, 0.05).name("Span").onChange(rebuild);
  gui.add(params, "height", 0.2, 2, 0.05).name("Body Height").onChange(rebuild);
  // The low-poly knob. At 3 the ogee's S is a zigzag; at 24 it is a curve.
  gui.add(params, "curveSegments", 2, 32, 1).name("Curve Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    disposeRow();
    stone.dispose();
    floor.dispose();
    dispose();
  };
}
