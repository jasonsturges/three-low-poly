import { BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, LatheGeometry, Path, Shape, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { bevelConvexGeometry } from "../../modeling/mesh/BevelConvexGeometry";
import type { MoldingStyle } from "../../modeling/profiles/MoldingProfiles";
import { MoldingGeometry } from "../architecture/MoldingGeometry";

/**
 * The stonemason's kit the cemetery's markers and monuments are assembled from — every part a solid,
 * every part in metres, base at `y = 0` unless it says otherwise. Nothing here knows which stone it is for.
 *
 * **Housed, never butted.** Where one part stands on another it is sunk into it by {@link HOUSE}: two
 * coplanar faces flicker, and a die standing exactly on its plinth's top face shows a seam of light under
 * the moulding that should have covered it.
 */

/** How far a part is sunk into the part it stands on. */
export const HOUSE = 0.012;

/**
 * Merge a stone's parts into one geometry for one material. Every part is reduced to positions only —
 * generators disagree about uvs, and the stone is flat-shaded, so normals are recomputed per face after
 * the merge. The inputs are disposed.
 */
export function mergeStone(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part.clone();
    for (const name of Object.keys(g.attributes)) if (name !== "position") g.deleteAttribute(name);
    g.clearGroups();
    return g;
  });
  const merged = mergeGeometries(flat, false);
  if (!merged) throw new Error("mergeStone: merge failed");
  merged.computeVertexNormals();
  for (const g of flat) g.dispose();
  for (const g of parts) g.dispose();
  return merged;
}

/**
 * Extrude a closed outline through `depth`, with a chamfer taken off every arris, face and back.
 *
 * The chamfer is kept INSIDE the outline, so the solid's silhouette is exactly the outline's: a sharp-edged
 * slab shows one lit face and one dark one, a chamfered one shows a bright line where they meet, and that
 * line is what makes cut stone read under low light.
 *
 * The solid lies in the outline's own plane, centred on Z: the outline's `x, y` are the solid's `x, y`, and
 * it runs `−depth/2 … +depth/2`. `holes` are cut through it. Either winding is accepted.
 */
export function extrudeOutline(outline: Vector2[], depth: number, { bevel = 0.01, holes = [] as Vector2[][] } = {}): BufferGeometry {
  const shape = new Shape(outline);
  for (const hole of holes) shape.holes.push(new Path(hole));
  const b = Math.max(0, Math.min(bevel, depth / 3));
  const body = Math.max(0.001, depth - b * 2);
  const g = new ExtrudeGeometry(shape, {
    depth: body,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    //  The chamfer eats back into the outline rather than growing past it.
    bevelOffset: -b,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.translate(0, 0, -body / 2);
  return g;
}

/**
 * A section extruded along X — a lid, a barrel, a lectern's wedge. `section` is `[z, y]` pairs; the solid
 * runs from `x = −length/2` to `+length/2`, chamfered by `bevel` inside its outline.
 */
export function extrudeAlongX(section: [number, number][], length: number, bevel = 0.01): BufferGeometry {
  const g = extrudeOutline(
    section.map(([z, y]) => new Vector2(z, y)),
    length,
    { bevel },
  );
  //  Extruded along Z in the shape's (x = z, y) plane. Turning −90° about Y takes the shape's x to world z
  //  and the extrusion to X — a rotation, so the winding survives.
  g.rotateY(-Math.PI / 2);
  return g;
}

/** A plan outline extruded UP — an annular bench, a curved wall. `plan` is `[x, z]` pairs; the solid runs from `y` to `y + height`. */
export function extrudeUp(plan: [number, number][], height: number, y = 0, bevel = 0.01): BufferGeometry {
  //  Outline (x, −z) extruded along Z, then turned −90° about X, lands (x, z) on the ground plane and the
  //  extrusion on +Y.
  const g = extrudeOutline(
    plan.map(([x, z]) => new Vector2(x, -z)),
    height,
    { bevel },
  );
  g.rotateX(-Math.PI / 2);
  g.translate(0, y + height / 2, 0);
  return g;
}

/** A block with its arrises taken off. Base at `y`, centred on X and Z. */
export function bevelBox(width: number, height: number, depth: number, { y = 0, radius = 0.012, segments = 1 } = {}): BufferGeometry {
  const box = new BoxGeometry(width, height, depth);
  const r = Math.min(radius, width / 3, height / 3, depth / 3);
  const { geometry } = bevelConvexGeometry(box, { radius: r, segments });
  box.dispose();
  geometry.translate(0, y + height / 2, 0);
  return geometry;
}

/**
 * A moulding run round a rectangle — a plinth's cap, a die's base, a cornice.
 *
 * - `"crown"`: hangs DOWN from the line at `y`, its top flush with it. Under an overhanging cap, or as the
 *   cap itself when nothing sits on it.
 * - `"base"`: stands UP from the line at `y`, its foot on it. Where a die meets the plinth under it.
 *
 * Either way it projects outward from the rectangle, whose sides it runs against.
 */
export function mouldingRing(
  width: number,
  depth: number,
  y: number,
  { run = "crown" as "crown" | "base", style = "ogee" as MoldingStyle, drop = 0.05, projection = 0.035, segments = 5 } = {},
): BufferGeometry {
  const w = width / 2;
  const d = depth / 2;
  const points = [new Vector3(-w, y, -d), new Vector3(w, y, -d), new Vector3(w, y, d), new Vector3(-w, y, d)];
  return new MoldingGeometry({ points, closed: true, style, run, facing: "outward", drop, projection, segments });
}

/** A square-sectioned block narrowing as it rises — a die with entasis, an obelisk's shaft. Base at `y`. */
export function taperedBlock(bottom: [number, number], top: [number, number], height: number, y = 0): BufferGeometry {
  //  A four-sided cylinder turned 45° has flat sides on the axes; scaled, it is any rectangle.
  const g = new CylinderGeometry(Math.SQRT1_2 * top[0], Math.SQRT1_2 * bottom[0], height, 4, 1);
  g.rotateY(Math.PI / 4);
  //  The cylinder's radii are one number per ring; depth follows by scaling Z by the ratio, which is exact
  //  when both rings share it and near enough when a block tapers the same both ways.
  g.scale(1, 1, bottom[1] / bottom[0]);
  g.translate(0, y + height / 2, 0);
  return g;
}

/** A square pyramid on a `width × depth` base at `y`, `height` tall. */
export function pyramid(width: number, depth: number, height: number, y = 0): BufferGeometry {
  const g = new CylinderGeometry(0, Math.SQRT1_2 * width, height, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(1, 1, depth / width);
  g.translate(0, y + height / 2, 0);
  return g;
}

/**
 * A turned part: `profile` as `[radius, y]` pairs from the axis at the foot round to the axis at the top,
 * so the solid is closed at both ends. Base where the profile says.
 */
export function turned(profile: [number, number][], radialSegments = 14): BufferGeometry {
  const points = profile.map(([r, y]) => new Vector2(Math.max(r, 0.0005), y));
  return new LatheGeometry(points, radialSegments);
}

/**
 * A closed stone urn, `height` tall: a foot, a waisted stem, a swelling body, a shoulder, a short neck and
 * a domed lid with a knop.
 */
export function urnGeometry(height = 0.44, radialSegments = 14): BufferGeometry {
  const s = height / 0.44;
  const profile: [number, number][] = [
    [0, 0],
    [0.085, 0],
    [0.085, 0.025],
    [0.06, 0.04],
    [0.042, 0.07], // the stem's waist
    [0.07, 0.1],
    [0.118, 0.15],
    [0.135, 0.2], // the belly
    [0.126, 0.25],
    [0.098, 0.29], // the shoulder
    [0.07, 0.31],
    [0.066, 0.33], // the neck
    [0.09, 0.34], // the lid's rim
    [0.086, 0.36],
    [0.06, 0.385],
    [0.024, 0.395],
    [0.03, 0.41], // the knop
    [0.028, 0.43],
    [0, 0.44],
  ];
  return turned(
    profile.map(([r, y]) => [r * s, y * s]),
    radialSegments,
  );
}

//------------------------------
//  Plinth
//------------------------------

export interface PlinthOptions {
  /** Defaults to `0.8`. */
  width?: number;
  /** Defaults to `0.18`. */
  height?: number;
  /** Defaults to `0.3`. */
  depth?: number;
  /** The moulding run round its top edge as a cap. `null` leaves it a plain block. Defaults to `"ogee"`. */
  capStyle?: MoldingStyle | null;
  /** How far down the side the cap moulding reaches. Defaults to `0.05`. */
  capDrop?: number;
  /** How far the cap moulding stands out from the side. Defaults to `0.03`. */
  capProjection?: number;
}

export const PLINTH_DEFAULTS: Required<PlinthOptions> = {
  width: 0.8,
  height: 0.18,
  depth: 0.3,
  capStyle: "ogee",
  capDrop: 0.05,
  capProjection: 0.03,
};

/**
 * The block a stone stands on, with a moulded cap — returned as parts, for the caller to merge with what
 * stands on it. The cap's top lies a hair below the block's, and its back a hair inside the block's sides,
 * so the two share no face.
 */
export function plinthParts(options: PlinthOptions = {}): BufferGeometry[] {
  const o = { ...PLINTH_DEFAULTS, ...options };
  const parts = [bevelBox(o.width, o.height, o.depth)];
  if (o.capStyle) {
    parts.push(mouldingRing(o.width - 0.004, o.depth - 0.004, o.height - 0.002, { run: "crown", style: o.capStyle, drop: o.capDrop, projection: o.capProjection }));
  }
  return parts;
}
