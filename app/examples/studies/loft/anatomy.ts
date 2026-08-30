import GUI from "lil-gui";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  Vector3,
} from "three";
import { alignRings, bestRingOffset, loft, resampleLoop, rotateRing, type ResampleMethod } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Anatomy of a Loft",
  description:
    "STUDY — what a loft actually IS, and how it differs from the sweep it is constantly confused with. " +
    "A SWEEP carries ONE profile along a path: the section never changes shape, and the path generates " +
    "the frames. A LOFT skins a SEQUENCE of cross-sections, each independently shaped and placed, and " +
    "there is no path at all — the sections themselves say where the surface goes. So a sweep is a " +
    "special CASE of a loft. `sweep()` already contains one: its 'stitch ring i to the next' loop is a " +
    "loft, and the frames-and-profile half merely generates the sections first. What a loft can do that " +
    "no sweep can is change the section — carry a SQUARE into a CIRCLE, four vertices into thirty-two. " +
    "In this library lofting was discovered through MITERING, which is why the vocabulary around it is " +
    "miter-shaped, but that is a consequence and not the premise. The name is literal and older than any " +
    "of it: lofting is shipbuilding, full-size cross-sections chalked on the floor of a mould LOFT with a " +
    "fair surface passed through them. `Station` in the sweep code is the same word from the same trade. " +
    "The hard problem is CORRESPONDENCE — which point on one section pairs with which point on the next — " +
    "and it is the exact counterpart of the frame problem in `studies/sweep/anatomy`. A sweep twists when " +
    "the FRAME is wrong; a loft twists when the CORRESPONDENCE is wrong. Identical artifact on screen, " +
    "unrelated cause. Correspondence splits in two and the dials are deliberately separate. RESAMPLING " +
    "reconciles sections with different vertex counts: proportional index is the cheap answer and bunches " +
    "points wherever an edge is short, arc length spaces them evenly along the perimeter and is the " +
    "general one, angular is exact on a star-convex section and wrong the moment one is not. Read the " +
    "two readouts against each other, because one of them is a TRAP: proportional index scores the " +
    "SHORTEST rails of the three on square-to-circle (59.00 against arc length's 60.46) while being " +
    "plainly the worst, because collapsing 32 points onto 4 corners is what makes those rails short. " +
    "Rail length is the objective ALIGNMENT minimizes, and it recovers every seam offset exactly; it " +
    "is not a resampling score and rewards degeneracy when asked to be one. Resampling is what the " +
    "second readout is for — 32 points arriving as 4 distinct with 28 collapsed edges is the defect, " +
    "and knowing which question a number answers is most of the skill. ALIGNMENT " +
    "places the seam, and Seam Offset proves the point on its own: cycle the second section's array and " +
    "the two circles are still geometrically IDENTICAL — same points, same order, different starting " +
    "index — yet the cylinder becomes a twisted prism. Correspondence is not determined by geometry, " +
    "which is why it has to be chosen. Best Rotation chooses it, by taking the cyclic offset that " +
    "minimizes total rail length, and the readout reports how far the current alignment sits from it. " +
    "Reverse Last Section shows the other failure: two sections wound opposite ways cannot be skinned at " +
    "all, and the surface pinches through itself rather than closing. " +
    "Worth noticing what is NOT here — no frames, no tangents, no parallel transport. A loft never needs " +
    "them, because a section already knows where it is. That absence is the cleanest statement of the " +
    "difference between the two primitives.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  SECTION         one cross-section: a closed 2D loop and a position along the loft. The unit a loft
//                  consumes, the way a STATION is the unit a sweep consumes.
//  CORRESPONDENCE  the pairing between one section's points and the next's. The subject of this study.
//  RESAMPLING      reconciling sections with different vertex counts, so a pairing can exist at all.
//  ALIGNMENT       where index 0 sits — which point is the seam. Free to choose, and geometry will not
//                  choose it for you.
//  RAIL            the line joining corresponded points across a band. Straight rails mean the
//                  correspondence agrees with the shape; spiraling rails are the twist.
//  BAND            the surface between two adjacent sections. A loft of N sections has N-1 bands.
//  SKIN            the whole lofted surface. In shipbuilding, exactly what it sounds like.
//
//  Deliberately NOT here: fairing (smoothing a surface through its sections rather than faceting
//  straight between them), branching lofts, and guide rails. All three are real and none is needed to
//  state what a loft is.

type SectionSet = "square-circle" | "triangle-square" | "twin" | "stack";

const DEG = 180 / Math.PI;

/** One cross-section: a closed loop in its own plane, and where it sits along the loft axis (+Y). */
interface Section {
  loop: Vector2[];
  at: number;
}

//------------------------------
//  Sections
//------------------------------

/** A regular polygon, wound counter-clockwise. `sides` is the low-poly knob and the whole point. */
function polygon(radius: number, sides: number, rotation = 0): Vector2[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = rotation + (i / sides) * Math.PI * 2;
    return new Vector2(Math.cos(a) * radius, Math.sin(a) * radius);
  });
}

/**
 * Four section sets, each isolating one thing.
 *
 * `square-circle`    4 vertices into 32. THE loft, and provably not a sweep: the section changes shape,
 *                    which is the one thing carrying a single profile along a path can never do.
 * `triangle-square`  3 into 4. Coprime counts, so no resampling divides evenly and every scheme has to
 *                    put its seams somewhere it can defend.
 * `twin`             two IDENTICAL circles. Geometry contributes nothing, so whatever happens on screen
 *                    is correspondence and correspondence alone. Drive Seam Offset here.
 * `stack`            five sections, 4 → 6 → 8 → 6 → 4. The N-section case, with the counts changing at
 *                    every band, which is where a real hull or fuselage lives.
 */
function buildSections(set: SectionSet, height: number): { sections: Section[]; label: string } {
  switch (set) {
    case "square-circle":
      return {
        sections: [
          { loop: polygon(0.9, 4, Math.PI / 4), at: 0 },
          { loop: polygon(0.75, 32), at: height },
        ],
        label: "4 vertices into 32 — the section CHANGES SHAPE, which no sweep can do",
      };

    case "triangle-square":
      return {
        sections: [
          { loop: polygon(0.95, 3, Math.PI / 2), at: 0 },
          { loop: polygon(0.85, 4, Math.PI / 4), at: height },
        ],
        label: "3 into 4 — coprime, so no resampling divides evenly and the seam must be argued for",
      };

    case "twin":
      return {
        sections: [
          { loop: polygon(0.8, 24), at: 0 },
          { loop: polygon(0.8, 24), at: height },
        ],
        label: "identical sections — anything you see is correspondence, not geometry",
      };

    case "stack": {
      const counts = [4, 6, 8, 6, 4];
      const radii = [0.55, 0.85, 0.95, 0.8, 0.5];
      return {
        sections: counts.map((sides, i) => ({
          loop: polygon(radii[i]!, sides, Math.PI / sides),
          at: (i / (counts.length - 1)) * height,
        })),
        label: "five sections, counts changing at every band — the general N-section case",
      };
    }
  }
}

//------------------------------
//  Correspondence
//------------------------------

/** Total rail length across one band — the study's own readout, not a library concern. */
function railLength(a: Vector3[], b: Vector3[]): number {
  return a.reduce((sum, p, i) => sum + p.distanceTo(b[i]!), 0);
}

/** Signed area. Two sections wound opposite ways cannot be skinned — the band turns inside out. */
function signedArea(loop: Vector2[]): number {
  let twice = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    twice += a.x * b.y - b.x * a.y;
  }
  return twice / 2;
}

//------------------------------
//  Drawing
//------------------------------

interface Line {
  a: Vector3;
  b: Vector3;
  color: Color;
  /** Fades the segment toward its start, so a line reads as an arrow without needing a head. */
  taper?: boolean;
}

/**
 * One `LineSegments` for a whole stage, colored per vertex.
 *
 * A single object rather than one per station: a 96-station diagram would otherwise be hundreds of
 * objects to add, traverse and dispose. Direction rides a brightness ramp — dark at the base, bright at
 * the tip — because line width is 1px whatever you ask for, in WebGL and WebGPU alike, so it cannot be
 * carried by weight.
 */
function lineSet(lines: Line[], material: LineBasicMaterial): LineSegments {
  const positions = new Float32Array(lines.length * 6);
  const colors = new Float32Array(lines.length * 6);
  const dim = new Color();

  lines.forEach(({ a, b, color, taper }, i) => {
    positions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    dim.copy(color).multiplyScalar(taper ? 0.28 : 1);
    colors.set([dim.r, dim.g, dim.b, color.r, color.g, color.b], i * 6);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return new LineSegments(geometry, material);
}

//------------------------------
//  Scene
//------------------------------

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x161a21, cameraPosition: [3.0, 2.4, 3.8] });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.6);
  key.position.set(3.5, 5, 4);
  const fill = new DirectionalLight(0x8ea8cc, 0.5);
  fill.position.set(-3.5, 1, -3);
  scene.add(key, fill);

  const solidMaterial = new MeshStandardMaterial({
    color: 0x9aa4b2,
    metalness: 0.5,
    roughness: 0.5,
    // A free planarity check: a lofted band between two differently-shaped sections is generally NOT
    // planar, and flat shading is what makes that visible instead of smoothing it away.
    flatShading: true,
    side: DoubleSide,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true });

  const COLOR = {
    section: new Color(0xe4ebf5),
    rail: new Color(0x5ce1ff),
    seam: new Color(0xffb454),
    axis: new Color(0x59657a),
  };

  const params = {
    set: "twin" as SectionSet,
    height: 1.8,

    resample: "arclength" as ResampleMethod,
    align: false,
    seam: 0,
    reverse: false,

    showSections: true,
    showRails: true,
    showSeam: true,
    showSolid: true,
    opacity: 0.35,
    cap: true,

    rails: "",
    resampling: "",
    twist: "",
    winding: "",
    counts: "",
    about: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();

    const { sections, label } = buildSections(params.set, params.height);

    // Every section is brought to ONE vertex count before anything else happens, because a pairing
    // cannot exist until they agree. The target is the largest authored count: resampling UP invents
    // positions along edges that are really there, while resampling DOWN would discard authored corners
    // and quietly round the shape.
    const target = Math.max(...sections.map((s) => s.loop.length));

    const loops = sections.map((section, index) => {
      const loop = resampleLoop(section.loop, target, params.resample);
      // Reversing stays in 2D so the signed area below sees it — that is what the winding readout reads.
      return index === sections.length - 1 && params.reverse ? [...loop].reverse() : loop;
    });

    const lift = (loop: Vector2[], y: number): Vector3[] => loop.map((p) => new Vector3(p.x, y, p.y));
    let rings = loops.map((loop, i) => lift(loop, sections[i]!.at));

    // Seam Offset applies to every ring AFTER the first, so ring 0 stays the reference. Applied in 3D
    // with the library's own `rotateRing` rather than to the 2D outlines: cycling a start index is
    // dimension-agnostic, so doing it here means the study is not carrying a second copy of it. Leaving
    // `loops` un-cycled is safe — signed area, distinct points and collapsed edges are all invariant
    // under a rotation of the array.
    if (params.seam !== 0) {
      rings = rings.map((ring, i) => (i === 0 ? ring : rotateRing(ring, params.seam)));
    }

    // BEST ROTATION, applied band by band: each ring is aligned against the one below it, already-aligned
    // ring. Aligning every ring against section 0 instead would fail on the stack, where the shape turns
    // gradually and only NEIGHBORS are reliably comparable.
    let excess = 0;
    if (params.align) {
      rings = alignRings(rings);
    } else {
      // Not applied — but still MEASURED, so the readout can say how far off the current seam is.
      for (let s = 1; s < rings.length; s++) {
        const k = bestRingOffset(rings[s - 1]!, rings[s]!);
        excess = Math.max(excess, Math.min(k, target - k));
      }
    }

    const lines: Line[] = [];

    // STAGE 1 — the sections. Closed loops, sitting where they sit. Note what is absent: no tangents and
    // no frames, because a section already knows where it is. That absence IS the difference from a sweep.
    if (params.showSections) {
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          lines.push({ a: ring[i]!, b: ring[(i + 1) % ring.length]!, color: COLOR.section });
        }
      }
    }

    // STAGE 2 — the rails. Point i of one section to point i of the next. This IS the correspondence:
    // straight rails mean it agrees with the shape, spiraling rails are the twist, and rails of wildly
    // different lengths mean the resampling is bunching points somewhere.
    let total = 0;
    let worst = 0;
    if (rings.length > 1) {
      for (let s = 0; s < rings.length - 1; s++) {
        const lower = rings[s]!;
        const upper = rings[s + 1]!;
        total += railLength(lower, upper);
        for (let i = 0; i < lower.length; i++) {
          worst = Math.max(worst, lower[i]!.distanceTo(upper[i]!));
          if (params.showRails) lines.push({ a: lower[i]!, b: upper[i]!, color: COLOR.rail, taper: true });
        }
      }
    }

    // STAGE 3 — the seam. Index 0 of every section, joined up. On a good loft it runs straight; when the
    // correspondence is spun it is the single line that shows you by how much.
    if (params.showSeam && rings.length > 1) {
      for (let s = 0; s < rings.length - 1; s++) {
        lines.push({ a: rings[s]![0]!, b: rings[s + 1]![0]!, color: COLOR.seam });
      }
    }

    if (lines.length > 0) stage.add(lineSet(lines, lineMaterial));

    // STAGE 4 — the skin, from the same rings the rails were drawn from.
    let triangles = 0;
    if (params.showSolid) {
      const geometry = loft(rings, { cap: params.cap });
      // `toBufferGeometry` returns INDEXED geometry, so the triangle count is in the index, not the
      // position attribute — `position.count / 3` counts shared vertices and is not even an integer.
      triangles = geometry.getIndex()!.count / 3;
      stage.add(new Mesh(geometry, solidMaterial));
    }

    const areas = loops.map(signedArea);
    const mixed = areas.some((a) => a > 0) && areas.some((a) => a < 0);

    // What rail length cannot see. A resampled section that lands several output points on one authored
    // vertex has spent its budget without buying any shape: the collapsed edges become zero-area quads,
    // which carry a zero normal (`faceNormal` guards the divide, so they go black rather than NaN).
    const distinct = new Set(
      loops.flatMap((loop) => loop.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`)),
    ).size;
    const authored = new Set(
      sections.flatMap((s) => s.loop.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`)),
    ).size;
    let collapsed = 0;
    for (const loop of loops) {
      for (let i = 0; i < loop.length; i++) {
        if (loop[i]!.distanceTo(loop[(i + 1) % loop.length]!) < 1e-9) collapsed++;
      }
    }

    params.rails = `${total.toFixed(3)} total · worst ${worst.toFixed(3)}`;
    params.resampling =
      collapsed === 0
        ? `${distinct} distinct points, none collapsed`
        : `${distinct} distinct of ${loops.length * target} · ${collapsed} COLLAPSED edges (was ${authored} authored)`;
    params.twist = params.align
      ? "aligned — shortest rails, by construction"
      : excess === 0
        ? "0 vertices — the seam is already where it belongs"
        : `${excess} vertices off (${((excess / target) * 360).toFixed(1)}° around the section)`;
    params.winding = mixed
      ? "MIXED — sections wound opposite ways, the skin turns inside out"
      : `consistent (${areas[0]! > 0 ? "counter-clockwise" : "clockwise"})`;
    params.counts = `${sections.map((s) => s.loop.length).join(" → ")} authored · ${target} after resampling · ${triangles} triangles`;
    params.about = label;
  };

  rebuild();
  // FRAME ONCE — the same rule as every other study here. Re-framing on a dial change throws away the
  // viewer's zoom, and the seam is one line wide.
  frameObject(handle, stage, { fit: 1.5 });

  const gui = new GUI();
  gui.title("Anatomy of a Loft");

  const shape = gui.addFolder("Sections");
  shape
    .add(params, "set", {
      "Square → Circle (4 → 32)": "square-circle",
      "Triangle → Square (3 → 4)": "triangle-square",
      "Twin Circles (identical)": "twin",
      "Stack (5 sections)": "stack",
    })
    .name("Sections")
    .onChange(rebuild);
  shape.add(params, "height", 0.4, 4, 0.1).name("Spacing").onChange(rebuild);
  shape.open();

  const pairing = gui.addFolder("Correspondence");
  // Half one: make a pairing POSSIBLE when the counts differ.
  pairing
    .add(params, "resample", {
      "Arc Length (general)": "arclength",
      "Proportional Index": "index",
      "Angular (star-convex only)": "angular",
    })
    .name("Resampling")
    .onChange(rebuild);
  // Half two: decide WHERE the seam goes. Nothing in the geometry decides this for you.
  pairing.add(params, "align").name("Best Rotation").onChange(rebuild);
  // The proof that correspondence is not geometry: cycling the array leaves the sections identical —
  // same points, same order, different index 0 — and twists the surface anyway. Drive it on Twin Circles.
  pairing.add(params, "seam", 0, 23, 1).name("Seam Offset").onChange(rebuild);
  // The other failure, and it is not a correspondence problem but an orientation one: opposite windings
  // cannot be skinned at all.
  pairing.add(params, "reverse").name("Reverse Last Section").onChange(rebuild);
  pairing.open();

  const stages = gui.addFolder("Stages");
  stages.add(params, "showSections").name("1 · Sections").onChange(rebuild);
  stages.add(params, "showRails").name("2 · Rails").onChange(rebuild);
  stages.add(params, "showSeam").name("3 · Seam").onChange(rebuild);
  stages.add(params, "showSolid").name("4 · Skin").onChange(rebuild);
  stages.add(params, "cap").name("Cap Ends").onChange(rebuild);
  stages
    .add(params, "opacity", 0.05, 1, 0.05)
    .name("Skin Opacity")
    .onChange((value: number) => {
      solidMaterial.opacity = value;
      solidMaterial.transparent = value < 1;
      solidMaterial.depthWrite = value >= 1;
      solidMaterial.needsUpdate = true;
    });
  stages.open();

  const readout = gui.addFolder("Readout");
  // The alignment objective. Deliberately NOT a quality score — see `railLength`.
  readout.add(params, "rails").name("Rail Length").listen().disable();
  // The one that actually judges resampling, and the one that catches proportional index.
  readout.add(params, "resampling").name("Resampling").listen().disable();
  readout.add(params, "twist").name("Seam vs Best").listen().disable();
  readout.add(params, "winding").name("Winding").listen().disable();
  readout.add(params, "counts").name("Built").listen().disable();
  readout.add(params, "about").name("These Sections").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    solidMaterial.dispose();
    lineMaterial.dispose();
    dispose();
  };
}
