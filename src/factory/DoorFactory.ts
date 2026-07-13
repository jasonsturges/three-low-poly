import {
  BufferGeometry,
  Color,
  ColorRepresentation,
  CylinderGeometry,
  ExtrudeGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ArchedSlabShape } from "../shapes/ArchedSlabShape";
import { ClubShape } from "../shapes/ClubShape";
import { SpadeShape } from "../shapes/SpadeShape";
import { StrapHingeShape } from "../shapes/StrapHingeShape";

export interface ArchedDoorOptions {
  /** Width of the door. Defaults to `1.3`. */
  width?: number;
  /** Height of the rectangular body, up to where the arch springs. Defaults to `1.9`. */
  height?: number;
  /** Rise of the arch above the springing. Defaults to `0.65`. */
  archHeight?: number;
  /** Thickness of the slab. Defaults to `0.12`. */
  thickness?: number;
  /** How finely the arch is tessellated — the low-poly knob. `3` is chiselled; `24` is cast. Defaults to `16`. */
  curveSegments?: number;

  /** Number of strap hinges. Defaults to `3`. */
  hinges?: number;
  /** How far each strap reaches across the door. Defaults to `0.85`. */
  hingeLength?: number;
  /** Width of a strap at the pin. Defaults to `0.22`. */
  hingeWidth?: number;
  /** How far a strap's edges bow inward. `0.5` is straight; less is forged. Defaults to `0.28`. */
  hingeSweep?: number;
  /** The decorative shape forged onto a strap's tip. Defaults to `"spade"`. */
  hingeTerminal?: "spade" | "club" | "none";

  /** Rows of studs across the face. Defaults to `4`. */
  studRows?: number;
  /** Columns of studs across the face. Defaults to `3`. */
  studCols?: number;
  /** Radius of a stud head. Defaults to `0.035`. */
  studRadius?: number;

  /** Wood material. Omit to build a flat-shaded standard material from `woodColor`. */
  woodMaterial?: Material;
  /** Wood tint when `woodMaterial` is omitted. Defaults to `#6b4f34`. */
  woodColor?: ColorRepresentation;
  /** Iron material. Omit to build a flat-shaded standard material from `ironColor`. */
  ironMaterial?: Material;
  /** Iron tint when `ironMaterial` is omitted. Defaults to `#2b2b2b`. */
  ironColor?: ColorRepresentation;
}

/**
 * A medieval arched door: a plank slab under an arch, with wrought strap hinges and iron studs.
 *
 * **Every part of this is the same operation.** The slab, the hinge strap, and the hinge's terminal are
 * not three techniques — they are three OUTLINES, each closed, filled, and given depth. Once that lands,
 * the whole medieval vocabulary opens up: fleurs, quatrefoils, escutcheons, escapes. They are drawings.
 *
 * Note what is NOT here: a hole. The arch is part of the door's OUTLINE, not a void cut out of a
 * rectangle. `Shape.holes` is for strictly INTERIOR voids — a "hole" that reaches an edge is not a hole
 * at all, and the triangulator will fill straight across it and hand you a face you never asked for.
 *
 * Returned as a single {@link Mesh} carrying a material ARRAY, with the wood and the iron in their own
 * geometry groups. A `Group` of two meshes would have worked too, and it would have pushed the cost onto
 * every caller: `door.castShadow = true` would silently do nothing, and you would be writing
 * `traverse(child => …)` forever. One mesh, one transform, one shadow flag.
 *
 * Dispose the geometry and both materials when finished.
 *
 * @example
 * ```ts
 * const door = createArchedDoor({ width: 1.4, hingeTerminal: "club" });
 * door.castShadow = true;
 * scene.add(door);
 * ```
 */
export function createArchedDoor({
  width = 1.3,
  height = 1.9,
  archHeight = 0.65,
  thickness = 0.12,
  curveSegments = 16,
  hinges = 3,
  hingeLength = 0.85,
  hingeWidth = 0.22,
  hingeSweep = 0.28,
  hingeTerminal = "spade",
  studRows = 4,
  studCols = 3,
  studRadius = 0.035,
  woodMaterial,
  woodColor = "#6b4f34",
  ironMaterial,
  ironColor = "#2b2b2b",
}: ArchedDoorOptions = {}): Mesh<BufferGeometry, Material[]> {
  const extrude = { bevelEnabled: false, curveSegments };

  // The slab: one outline, arch included.
  const slab = new ExtrudeGeometry(new ArchedSlabShape({ width, height, archWidth: width, archHeight }), {
    ...extrude,
    depth: thickness,
  });

  const iron: BufferGeometry[] = [];
  const face = thickness + 0.001; // sit the ironwork just proud of the door's face

  for (let i = 0; i < hinges; i++) {
    // Space the straps up the body, keeping clear of the springing.
    const y = height * ((i + 1) / (hinges + 1)) * 0.92 + height * 0.04;

    const strap = new ExtrudeGeometry(
      new StrapHingeShape({ length: hingeLength, width: hingeWidth, sweep: hingeSweep }),
      { ...extrude, depth: 0.02 },
    );
    strap.translate(-width / 2, y, face);
    iron.push(strap);

    // The terminal forged onto the tip — a card suit, which is exactly what a smith would reach for.
    if (hingeTerminal !== "none") {
      const size = hingeWidth * 0.55;

      const shape: Shape =
        hingeTerminal === "spade" ? new SpadeShape({ size }) : new ClubShape({ size });

      const tip = new ExtrudeGeometry(shape, { ...extrude, depth: 0.02 });
      tip.rotateZ(-Math.PI / 2); // the point faces along the strap, away from the pin
      tip.translate(-width / 2 + hingeLength + hingeWidth * 0.35, y, face);
      iron.push(tip);
    }

    // The pin barrel at the hinge edge.
    const barrel = new CylinderGeometry(0.022, 0.022, hingeWidth * 1.3, 6);
    barrel.translate(-width / 2, y, face + 0.01);
    iron.push(barrel);
  }

  for (let r = 0; r < studRows; r++) {
    for (let c = 0; c < studCols; c++) {
      const x = -width / 2 + (width * (c + 1)) / (studCols + 1);
      const y = (height * (r + 1)) / (studRows + 1);

      const stud = new SphereGeometry(studRadius, 6, 4);
      stud.scale(1, 1, 0.6); // squashed — a rivet head, not a ball
      stud.translate(x, y, face + studRadius * 0.3);
      iron.push(stud);
    }
  }

  const wood = woodMaterial ?? new MeshStandardMaterial({ color: new Color(woodColor), roughness: 0.95, flatShading: true });

  const forged =
    ironMaterial ??
    new MeshStandardMaterial({
      color: new Color(ironColor),
      metalness: 0.8,
      roughness: 0.45,
      flatShading: true,
    });

  // ExtrudeGeometry is non-indexed; CylinderGeometry and SphereGeometry are indexed. mergeGeometries
  // will not mix the two, so the indexed ones are flattened first. Note `toNonIndexed()` returns THIS
  // when a geometry is already non-indexed — it does not copy — so it must only be called on the
  // indexed ones, or the extrudes get double-disposed and warn on every rebuild.
  const flattened = iron.map((part) => (part.index ? part.toNonIndexed() : part));

  // One merge, with groups: group 0 is the wood, group 1 is the iron. Merging even when there is no
  // ironwork means the returned geometry is never one of the parts, so every part can be disposed.
  const ironwork = flattened.length ? (mergeGeometries(flattened, false) as BufferGeometry) : null;

  const geometry = mergeGeometries(ironwork ? [slab, ironwork] : [slab], true) as BufferGeometry;

  slab.dispose();
  ironwork?.dispose();
  flattened.forEach((part, i) => {
    if (part !== iron[i]) part.dispose(); // a genuine copy, made by toNonIndexed
  });
  iron.forEach((part) => part.dispose());

  const mesh = new Mesh<BufferGeometry, Material[]>(geometry, ironwork ? [wood, forged] : [wood]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}
