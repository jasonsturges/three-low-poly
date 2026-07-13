import GUI from "lil-gui";
import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Arched Door (extrude prototype)",
  description: "TEMPORARY — arched slab + strap hinges + studs. Every part is one extruded outline.",
};

/**
 * A medieval arched door: a plank slab under an arch, with wrought strap hinges and iron studs.
 *
 * EVERY SHAPE HERE IS THE SAME OPERATION — a closed 2D outline, filled, and given depth. The door,
 * the hinge strap, and the hinge's decorative terminal are not three techniques; they are three
 * OUTLINES. Once you see that, the whole medieval vocabulary opens up: fleurs, spades, clubs,
 * quatrefoils, escutcheons. They are all drawings.
 *
 * Note what is NOT here: a hole. The arch is part of the door's OUTLINE, not a void cut out of a
 * rectangle. `Shape.holes` is for strictly INTERIOR voids; a "hole" that reaches an edge is not a
 * hole at all, and the triangulator will fill across it and leave you a face you did not ask for.
 */

// ---------------------------------------------------------------------------------------------
// OUTLINES
// ---------------------------------------------------------------------------------------------

/** A rectangle with an arched top. `archWidth < width` leaves shoulders and gives you a headstone. */
function archedSlabShape(width: number, height: number, archWidth: number, archHeight: number): Shape {
  const hw = width / 2;
  const ha = Math.min(archWidth, width) / 2;

  const shape = new Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, height);
  if (ha < hw) shape.lineTo(ha, height);
  shape.absellipse(0, height, ha, archHeight, 0, Math.PI, false);
  if (ha < hw) shape.lineTo(-hw, height);
  shape.closePath();

  return shape;
}

/**
 * A wrought strap hinge — wide at the hinge, drawn out to a point, with its sides bowing INWARD.
 *
 * That inward bow is the whole character of the thing. `sweep` controls it: at `0.5` the sides are
 * straight and you get a dull triangle; below that they curve in and it starts to look forged. It is
 * the same instinct as the iron scroll — the smith draws the metal out, and the taper is a curve.
 */
function strapHingeShape(length: number, width: number, sweep: number): Shape {
  const hw = width / 2;

  const shape = new Shape();
  shape.moveTo(0, -hw);
  shape.lineTo(0, hw); // the straight edge, against the hinge pin

  // Out to the tip, the control point pulled toward the centerline so the edge bows inward.
  shape.quadraticCurveTo(length * 0.55, hw * sweep, length, 0);
  shape.quadraticCurveTo(length * 0.55, -hw * sweep, 0, -hw);
  shape.closePath();

  return shape;
}

/** A spade — a heart, inverted, on a stem. The classic hinge terminal, and a card suit. */
export function spadeShape(size: number): Shape {
  const s = size;
  const shape = new Shape();

  shape.moveTo(0, s); // the point
  shape.bezierCurveTo(0.15 * s, 0.55 * s, 0.55 * s, 0.5 * s, 0.72 * s, 0.2 * s);
  shape.bezierCurveTo(0.95 * s, -0.15 * s, 0.55 * s, -0.5 * s, 0.16 * s, -0.28 * s);
  shape.lineTo(0.3 * s, -0.75 * s); // the stem
  shape.lineTo(-0.3 * s, -0.75 * s);
  shape.lineTo(-0.16 * s, -0.28 * s);
  shape.bezierCurveTo(-0.55 * s, -0.5 * s, -0.95 * s, -0.15 * s, -0.72 * s, 0.2 * s);
  shape.bezierCurveTo(-0.55 * s, 0.5 * s, -0.15 * s, 0.55 * s, 0, s);
  shape.closePath();

  return shape;
}

/** A club — three lobes on a stem. */
export function clubShape(size: number): Shape {
  const s = size;
  const r = 0.34 * s;
  const shape = new Shape();

  shape.moveTo(0.16 * s, -0.28 * s);
  shape.lineTo(0.3 * s, -0.75 * s); // the stem
  shape.lineTo(-0.3 * s, -0.75 * s);
  shape.lineTo(-0.16 * s, -0.28 * s);

  // three lobes, walked counter-clockwise
  shape.absarc(-0.5 * s, -0.1 * s, r, -0.5, Math.PI * 0.95, false);
  shape.absarc(0, 0.42 * s, r, Math.PI * 0.85, Math.PI * 0.15, false);
  shape.absarc(0.5 * s, -0.1 * s, r, Math.PI * 0.05, Math.PI + 0.5, false);
  shape.closePath();

  return shape;
}

// ---------------------------------------------------------------------------------------------
// THE DOOR
// ---------------------------------------------------------------------------------------------

interface DoorOptions {
  width: number;
  height: number;
  archHeight: number;
  thickness: number;
  curveSegments: number;

  hinges: number;
  hingeLength: number;
  hingeWidth: number;
  /** How far the strap's edges bow inward. `0.5` is straight; less is forged. */
  hingeSweep: number;
  hingeTerminal: "spade" | "club" | "none";

  studRows: number;
  studCols: number;
  studRadius: number;
}

const IRON = new MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.8, roughness: 0.45, flatShading: true });
const OAK = new MeshStandardMaterial({ color: 0x6b4f34, roughness: 0.95, flatShading: true });

function buildDoor(o: DoorOptions): Group {
  const group = new Group();
  const extrude = { bevelEnabled: false, curveSegments: o.curveSegments };

  // --- the slab: one outline, arch included -------------------------------------------------
  const slab = new ExtrudeGeometry(archedSlabShape(o.width, o.height, o.width, o.archHeight), {
    ...extrude,
    depth: o.thickness,
  });
  group.add(new Mesh(slab, OAK));

  // --- the ironwork ------------------------------------------------------------------------
  const iron: BufferGeometry[] = [];
  const face = o.thickness + 0.001; // sit the ironwork just proud of the door's face

  for (let i = 0; i < o.hinges; i++) {
    // Space the straps up the door, keeping clear of the springing.
    const y = o.height * ((i + 1) / (o.hinges + 1)) * 0.92 + o.height * 0.04;

    const strap = new ExtrudeGeometry(strapHingeShape(o.hingeLength, o.hingeWidth, o.hingeSweep), {
      ...extrude,
      depth: 0.02,
    });
    strap.translate(-o.width / 2, y, face);
    iron.push(strap);

    // The decorative terminal at the tip — a card suit, which is exactly what a smith would forge.
    if (o.hingeTerminal !== "none") {
      const shape = o.hingeTerminal === "spade" ? spadeShape : clubShape;
      const tip = new ExtrudeGeometry(shape(o.hingeWidth * 0.55), { ...extrude, depth: 0.02 });
      tip.rotateZ(-Math.PI / 2); // the point faces along the strap, away from the hinge
      tip.translate(-o.width / 2 + o.hingeLength + o.hingeWidth * 0.35, y, face);
      iron.push(tip);
    }

    // The pin barrel at the hinge edge.
    const barrel = new CylinderGeometry(0.022, 0.022, o.hingeWidth * 1.3, 6);
    barrel.translate(-o.width / 2, y, face + 0.01);
    iron.push(barrel);
  }

  // --- studs: a grid of rivets across the planks -------------------------------------------
  for (let r = 0; r < o.studRows; r++) {
    for (let c = 0; c < o.studCols; c++) {
      const x = -o.width / 2 + (o.width * (c + 1)) / (o.studCols + 1);
      const y = (o.height * (r + 1)) / (o.studRows + 1);

      const stud = new SphereGeometry(o.studRadius, 6, 4);
      stud.scale(1, 1, 0.6); // squashed — a rivet head, not a ball
      stud.translate(x, y, face + o.studRadius * 0.3);
      iron.push(stud);
    }
  }

  if (iron.length) {
    group.add(new Mesh(mergeGeometries(iron.map((g) => g.toNonIndexed()), false)!, IRON));
  }

  return group;
}

// ---------------------------------------------------------------------------------------------

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x9aa7b2, cameraPosition: [0.5, 1.6, 3.2] });

  const params: DoorOptions = {
    width: 1.3,
    height: 1.9,
    archHeight: 0.65,
    thickness: 0.12,
    curveSegments: 16,
    hinges: 3,
    hingeLength: 0.85,
    hingeWidth: 0.22,
    hingeSweep: 0.28,
    hingeTerminal: "spade",
    studRows: 4,
    studCols: 3,
    studRadius: 0.035,
  };

  let door = buildDoor(params);
  scene.add(door);

  const rebuild = () => {
    door.traverse((c) => {
      if (c instanceof Mesh) c.geometry.dispose();
    });
    scene.remove(door);
    door = buildDoor(params);
    scene.add(door);
  };

  const gui = new GUI();
  const slab = gui.addFolder("Slab");
  slab.add(params, "width", 0.6, 2.5, 0.05).name("Width").onChange(rebuild);
  slab.add(params, "height", 0.8, 3, 0.05).name("Body Height").onChange(rebuild);
  slab.add(params, "archHeight", 0.1, 1.4, 0.05).name("Arch Rise").onChange(rebuild);
  slab.add(params, "thickness", 0.03, 0.4, 0.01).name("Thickness").onChange(rebuild);
  // The low-poly knob, on a filled arch. 3 is chiselled; 24 is cast.
  slab.add(params, "curveSegments", 2, 32, 1).name("Curve Segments").onChange(rebuild);

  const hinge = gui.addFolder("Strap Hinges");
  hinge.add(params, "hinges", 0, 5, 1).name("Count").onChange(rebuild);
  hinge.add(params, "hingeLength", 0.2, 1.6, 0.05).name("Length").onChange(rebuild);
  hinge.add(params, "hingeWidth", 0.06, 0.5, 0.01).name("Width").onChange(rebuild);
  // 0.5 = straight sides (a dull triangle). Lower and the edges bow IN — it starts to look forged.
  hinge.add(params, "hingeSweep", 0.05, 0.5, 0.01).name("Inward Sweep").onChange(rebuild);
  hinge.add(params, "hingeTerminal", ["spade", "club", "none"]).name("Terminal").onChange(rebuild);
  hinge.open();

  const studs = gui.addFolder("Studs");
  studs.add(params, "studRows", 0, 8, 1).name("Rows").onChange(rebuild);
  studs.add(params, "studCols", 0, 6, 1).name("Columns").onChange(rebuild);
  studs.add(params, "studRadius", 0.01, 0.08, 0.005).name("Radius").onChange(rebuild);

  return () => {
    gui.destroy();
    door.traverse((c) => {
      if (c instanceof Mesh) c.geometry.dispose();
    });
    dispose();
  };
}
