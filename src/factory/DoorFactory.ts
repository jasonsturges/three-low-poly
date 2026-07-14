import {
  BufferGeometry,
  Color,
  ColorRepresentation,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ArchStyle } from "../shapes/ArchProfile";
import { ArchedSlabHalf, ArchedSlabShape } from "../shapes/ArchedSlabShape";
import { ClubShape } from "../shapes/ClubShape";
import { SpadeShape } from "../shapes/SpadeShape";
import { StrapHingeShape } from "../shapes/StrapHingeShape";

/** Which jamb a door hangs from — and therefore where its origin sits. */
export type DoorHinge = "left" | "right";

/** A door slab, wood and iron in their own geometry groups. */
export type DoorLeaf = Mesh<BufferGeometry, Material[]>;

export interface ArchedDoorOptions {
  /** Width of the door. Defaults to `1.3`. */
  width?: number;
  /**
   * Which jamb the door hangs from. Defaults to `"left"`.
   *
   * This places the strap hinges — and, because the door's origin is its hinge, it also decides which
   * edge lands on `x = 0`. See the note on the returned mesh's frame.
   */
  hinge?: DoorHinge;
  /** Height of the rectangular body, up to where the arch springs. Defaults to `1.9`. */
  height?: number;
  /**
   * Rise of the arch above the springing — the ellipse's VERTICAL RADIUS, in world units. Defaults to
   * `0.65`, which against the default `width` of `1.3` is a **perfect semicircle**.
   *
   * **`archHeight === width / 2` is the arch you want.** Equal radii make the ellipse a circle: a Roman
   * arch. Below that it flattens (segmental — a gatehouse); above it, it stretches tall.
   *
   * | Opening | Semicircle rise |
   * | --- | --- |
   * | `1.3` | `0.65` |
   * | `2.6` | `1.3` |
   * | `w` | `w / 2` |
   *
   * **The rise does not follow the width.** Resize the door and the arch keeps whatever rise it had, so
   * it quietly changes character — `width: 2.6` with the default `0.65` is a squat segmental arch, not a
   * bigger version of the same door.
   */
  archHeight?: number;
  /**
   * Which arch tops the door. Defaults to `elliptical`. See {@link ArchStyle}.
   *
   * Give a door the same arch as the opening it hangs in and the two match exactly, because they draw
   * the same curve. A double door splits at the CROWN, so a pointed or ogee arch still parts cleanly
   * down the middle — each leaf just carries half the point.
   */
  arch?: ArchStyle;
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
 * One door leaf, hung on its hinge.
 *
 * `span` is the opening the ARCH spans; `half` says whether this leaf fills that opening or only one
 * side of it. Everything is drawn in the doorway's frame — the arch centered on `x = 0` — and then slid
 * so the hinge edge lands on the origin, which is the last thing that happens here.
 */
function buildLeaf(
  options: ArchedDoorOptions,
  span: number,
  hinge: DoorHinge,
  half: ArchedSlabHalf | undefined,
): DoorLeaf {
  const {
    height = 1.9,
    archHeight = 0.65,
    arch = "elliptical",
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
  } = options;

  const extrude = { bevelEnabled: false, curveSegments };

  // The hinge always hangs on the OUTER edge of the opening — for a half leaf, that is the edge away
  // from the meeting stile, so the crown is always opposite the pin. There is no way to ask for a leaf
  // hinged on its tall side, because no such door exists.
  const hingeX = (hinge === "left" ? -1 : 1) * (span / 2);
  const reach = hinge === "left" ? 1 : -1; // the direction a strap runs, away from the pin

  // The leaf's own footprint in doorway coordinates — where the studs get spread.
  const leafMinX = half === "right" ? 0 : -span / 2;
  const leafWidth = half ? span / 2 : span;

  // The slab: one outline, arch included.
  const slab = new ExtrudeGeometry(
    new ArchedSlabShape({ width: span, height, archWidth: span, archHeight, half, arch }),
    { ...extrude, depth: thickness },
  );

  const iron: BufferGeometry[] = [];
  const face = thickness + 0.001; // sit the ironwork just proud of the door's face

  for (let i = 0; i < hinges; i++) {
    // Space the straps up the body, keeping clear of the springing.
    const y = height * ((i + 1) / (hinges + 1)) * 0.92 + height * 0.04;

    const strap = new ExtrudeGeometry(
      new StrapHingeShape({ length: hingeLength, width: hingeWidth, sweep: hingeSweep }),
      { ...extrude, depth: 0.02 },
    );
    // A right-hung strap is the mirror of a left-hung one — but the strap is symmetric about its own
    // length axis, so a half turn about Z IS that mirror. Rotating rather than scaling by -1 keeps the
    // winding (and therefore the normals) intact, with no need to rebuild them afterwards.
    if (reach < 0) strap.rotateZ(Math.PI);
    strap.translate(hingeX, y, face);
    iron.push(strap);

    // The terminal forged onto the tip — a card suit, which is exactly what a smith would reach for.
    if (hingeTerminal !== "none") {
      const size = hingeWidth * 0.55;

      const shape: Shape =
        hingeTerminal === "spade" ? new SpadeShape({ size }) : new ClubShape({ size });

      const tip = new ExtrudeGeometry(shape, { ...extrude, depth: 0.02 });
      // The point faces along the strap, away from the pin — whichever way that is. Spade and club are
      // both symmetric about their stems, so turning one is the same as mirroring it.
      tip.rotateZ((-Math.PI / 2) * reach);
      tip.translate(hingeX + reach * (hingeLength + hingeWidth * 0.35), y, face);
      iron.push(tip);
    }

    // The pin barrel at the hinge edge.
    const barrel = new CylinderGeometry(0.022, 0.022, hingeWidth * 1.3, 6);
    barrel.translate(hingeX, y, face + 0.01);
    iron.push(barrel);
  }

  for (let r = 0; r < studRows; r++) {
    for (let c = 0; c < studCols; c++) {
      const x = leafMinX + (leafWidth * (c + 1)) / (studCols + 1);
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

  // Put the origin on the hinge — and the hinge is a LINE, so both coordinates have to land on it. `x`
  // is the hinge edge, and `z` is the door's FRONT face, because that is the side the straps are bolted
  // to and the pin stands on. Anchor `z` at the back face instead and the door swings about its far
  // edge while its pin orbits out in front of it, which is not a hinge; it is a turntable.
  //
  // So the slab hangs BEHIND the origin plane, in -Z, and the ironwork sits a hair proud of it in +Z.
  // The door opens toward +Z — toward its own hinges — which is what "outward" means on a real door.
  geometry.translate(-hingeX, 0, -thickness);

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
 * **The origin is the HINGE, not the center.** `y = 0` is the sill, as everywhere else in this library,
 * but `x = 0` is the hinge edge and `z = 0` is the front face, where the straps are bolted and the pin
 * stands. Those two together are the hinge AXIS, so the door opens with `door.rotation.y` and nothing
 * more. The rule is the same one that seam-anchors a tile: anchor a thing where it JOINS the world. A
 * door joins at its hinge.
 *
 * The slab therefore lies entirely to one side of the origin — in `+x` for a left-hung door — and
 * entirely BEHIND it, in `-z`, with the ironwork proud of the face in `+z`.
 *
 * **Which way it opens is the sign of the angle, and the sign depends on the hand.** A door opens
 * OUTWARD, toward `+z`, because that is the side its hinges are on:
 *
 * ```ts
 * left.rotation.y  = -angle; // outward
 * right.rotation.y =  angle; // outward — mirrored, so the sign flips
 * ```
 *
 * Reverse the signs and it swings inward instead, through where the wall would be.
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
 * door.position.x = -1.4 / 2; // hang the hinge on the jamb
 * scene.add(door);
 *
 * door.rotation.y = -0.9; // swings out on its hinge, because the hinge is its origin
 * ```
 */
export function createArchedDoor(options: ArchedDoorOptions = {}): DoorLeaf {
  const { width = 1.3, hinge = "left" } = options;
  return buildLeaf(options, width, hinge, undefined);
}

export interface DoubleDoorOptions extends Omit<ArchedDoorOptions, "hinge"> {
  /**
   * Width of the whole opening, jamb to jamb — **not** the width of one leaf. Defaults to `2.6`, which
   * is two doors of the standard `1.3`.
   *
   * The arch spans this, and each leaf takes half of it. Which is the thing to watch: **`archHeight` is
   * measured against this OPENING, not against a leaf.** A semicircle over a `2.6` opening wants
   * `archHeight: 1.3`, not `0.65` — see {@link ArchedDoorOptions.archHeight}.
   */
  width?: number;
}

/**
 * Two leaves under one arch, each hung on its own jamb.
 *
 * **The arch is shared, and that is the entire trick.** Each leaf carries half of ONE ellipse spanning
 * the full opening — not its own smaller arch. Build two doors of half the width instead and each
 * crowns at its own center: you get an `M`. So the leaves are asymmetric, short at the hinge and tall at
 * the meeting stile, and they only make sense as a pair.
 *
 * **Opening them.** Each leaf's origin is its own hinge axis — the hinge edge, on the front face — so a
 * leaf swings with `rotation.y` alone: no pivot group, no offset. The leaves mirror, so **their angles
 * are opposite in sign**, and doors open OUTWARD, toward the face their hinges are on:
 *
 * ```ts
 * doors.left.rotation.y = -angle; // outward, toward +Z
 * doors.right.rotation.y = angle;
 * ```
 *
 * Flip both signs and they swing inward. Give them different magnitudes and one stands ajar. The leaves
 * are ordinary meshes and the {@link Group} does not own their motion, which is deliberate — a door that
 * owns its own animation is a door you cannot animate any other way.
 *
 * Dispose each leaf's geometry and materials when finished.
 *
 * @example
 * ```ts
 * const doors = createDoubleDoor({ width: 2.6, archHeight: 0.9 });
 * scene.add(doors);
 *
 * doors.left.rotation.y = -0.8;
 * doors.right.rotation.y = 0.8;
 * ```
 *
 * @example
 * The default single door, split down the middle — same opening, same circle, two leaves. `archHeight`
 * is half the OPENING (not half a leaf), so it stays `0.65`, and the ironwork scales to the narrower
 * leaf.
 *
 * ```ts
 * const doors = createDoubleDoor({
 *   width: 1.3,        // the whole opening — each leaf is 0.65
 *   archHeight: 0.65,  // = width / 2, so the arch is a true semicircle
 *   hingeLength: 0.42, // the stock 0.85 would overshoot a 0.65-wide leaf
 *   studCols: 2,
 * });
 * ```
 */
export function createDoubleDoor(options: DoubleDoorOptions = {}): DoubleDoor {
  const { width = 2.6 } = options;

  const doors = new Group() as DoubleDoor;

  doors.left = buildLeaf(options, width, "left", "left");
  doors.right = buildLeaf(options, width, "right", "right");

  // Each leaf's origin is its hinge, so hanging it is just putting that hinge on its jamb.
  doors.left.position.x = -width / 2;
  doors.right.position.x = width / 2;

  doors.add(doors.left, doors.right);

  return doors;
}

/** Two leaves under one arch. See {@link createDoubleDoor} for how to swing them. */
export interface DoubleDoor extends Group {
  /** Hung on the left jamb. Opens OUTWARD on a NEGATIVE `rotation.y`. */
  left: DoorLeaf;
  /** Hung on the right jamb. Opens OUTWARD on a POSITIVE `rotation.y` — it mirrors the left. */
  right: DoorLeaf;
}
