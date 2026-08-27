import { BoxGeometry, BufferGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Path, Shape } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TestTubeGeometry, type TestTubeGeometryOptions } from "../geometry/vessels/TestTubeGeometry";
import { createLiquidFill, type FillOptions } from "./liquidFill";

export interface TestTubeRackOptions {
  /** Tubes per row. Defaults to `6`. */
  columns?: number;
  /** Rows of tubes. Defaults to `1`. */
  rows?: number;
  /** Tube geometry — its radius and height size the whole rack. */
  tube?: TestTubeGeometryOptions;
  /** Optional liquid in every tube — colour, opacity, glow, fill level. */
  fill?: FillOptions;
  /** Gap between neighbouring tubes, added to the diameter for the pitch. Defaults to `0.9 ×` the tube radius. */
  gap?: number;
  /**
   * Height of the top plate — how high up the tube the rack holds it — as a fraction of the tube height.
   * Defaults to `0.55`. Clamped to `[0.1, 0.9]` so the tube always seats on the base and protrudes above.
   */
  rise?: number;
  /** Glass material for the tubes. A translucent default is supplied. */
  glassMaterial?: MeshStandardMaterial;
  /** Frame material for the rack. A wood default is supplied. */
  rackMaterial?: MeshStandardMaterial;
}

/**
 * A rack of test tubes — a row or grid, each seated by its rounded bottom on the base and held through the
 * top plate. Nothing floats.
 *
 * A spatial factory: it sizes a two-plate frame (base + top plate on corner posts) to whatever tube it is
 * given, lays the tubes out on a pitch, and rests the whole `Group` on Y=0. Everything is proportional to
 * the tube radius, so one set of numbers holds across tube sizes.
 *
 * The frame is ONE merged opaque mesh; the tubes are SEPARATE glass meshes sharing a single geometry —
 * glass sorts per object, so it cannot be baked into the opaque frame.
 */
export class TestTubeRack extends Group {
  constructor({ columns = 6, rows = 1, tube, fill, gap, rise = 0.55, glassMaterial, rackMaterial }: TestTubeRackOptions = {}) {
    super();

    const tubeGeometry = new TestTubeGeometry(tube);
    const r = tubeGeometry.radius;
    const h = tubeGeometry.height;

    const pitch = 2 * r + (gap ?? 0.9 * r);

    // Frame proportions, all relative to the tube radius.
    const baseThickness = 0.4 * r;
    const topThickness = 0.5 * r;
    const postSize = 0.7 * r;
    const holdHeight = baseThickness + Math.max(0.1, Math.min(0.9, rise)) * h; // underside of the top plate
    const plateWidth = columns * pitch;
    const plateDepth = rows * pitch;

    // --- frame: base + top plate + four corner posts, merged into one opaque mesh ---
    const parts: BufferGeometry[] = [];

    const base = new BoxGeometry(plateWidth, baseThickness, plateDepth);
    base.translate(0, baseThickness / 2, 0);
    parts.push(base);

    // Top plate — a board with a clean round hole per tube, cut the way a pipe-organ windchest drills pipe
    // holes: one Shape, a Path hole each, one extrusion. No CSG. ExtrudeGeometry handles the hole winding;
    // the holes never overlap or reach the edge (pitch/2 > holeRadius), so nothing triangulates to a knot.
    const holeRadius = r * 1.12;
    const holeSegments = 20;
    const plate = new Shape();
    plate.moveTo(-plateWidth / 2, -plateDepth / 2);
    plate.lineTo(plateWidth / 2, -plateDepth / 2);
    plate.lineTo(plateWidth / 2, plateDepth / 2);
    plate.lineTo(-plateWidth / 2, plateDepth / 2);
    plate.closePath();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const hx = (col - (columns - 1) / 2) * pitch;
        const hz = -(row - (rows - 1) / 2) * pitch; // shape-Y maps to world −Z after the rotation below
        const hole = new Path();
        for (let i = 0; i <= holeSegments; i++) {
          const a = (i / holeSegments) * Math.PI * 2;
          const px = hx + Math.cos(a) * holeRadius;
          const pz = hz + Math.sin(a) * holeRadius;
          if (i === 0) hole.moveTo(px, pz);
          else hole.lineTo(px, pz);
        }
        hole.closePath();
        plate.holes.push(hole);
      }
    }
    const top = new ExtrudeGeometry(plate, { depth: topThickness, bevelEnabled: false, curveSegments: 1 });
    top.rotateX(-Math.PI / 2); // XY board → lies flat in XZ, thickness up +Y
    top.translate(0, holdHeight, 0);
    parts.push(top);

    const postHeight = holdHeight - baseThickness;
    const px = plateWidth / 2 - postSize / 2;
    const pz = plateDepth / 2 - postSize / 2;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new BoxGeometry(postSize, postHeight, postSize);
        post.translate(sx * px, baseThickness + postHeight / 2, sz * pz);
        parts.push(post);
      }
    }

    // The extruded plate is non-indexed while the boxes are indexed; mergeGeometries needs them uniform.
    const rack = new Mesh(
      mergeGeometries(
        parts.map((g) => (g.index ? g.toNonIndexed() : g)),
        false,
      ) as BufferGeometry,
      rackMaterial ?? new MeshStandardMaterial({ color: 0x8a5a3b, roughness: 0.75, metalness: 0.05, flatShading: true }),
    );
    rack.castShadow = true;
    rack.receiveShadow = true;
    this.add(rack);

    // --- tubes: separate glass meshes sharing one geometry, bottoms resting on the base plate ---
    const glass =
      glassMaterial ?? new MeshStandardMaterial({ color: 0xbfe3e0, roughness: 0.15, transparent: true, opacity: 0.4 });

    // One liquid geometry + material for the whole rack; each tube gets a mesh sharing them.
    const liquidTemplate = fill ? createLiquidFill(tubeGeometry.profile, fill, tube?.radialSegments ?? 32) : null;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = (col - (columns - 1) / 2) * pitch;
        const z = (row - (rows - 1) / 2) * pitch;

        const t = new Mesh(tubeGeometry, glass);
        t.position.set(x, baseThickness, z);
        t.castShadow = true;
        t.renderOrder = 1; // glass after the liquid
        this.add(t);

        if (liquidTemplate) {
          const liquid = new Mesh(liquidTemplate.geometry, liquidTemplate.material);
          liquid.position.set(x, baseThickness, z);
          liquid.renderOrder = 0;
          this.add(liquid);
        }
      }
    }
  }
}
