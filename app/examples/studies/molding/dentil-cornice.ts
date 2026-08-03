import GUI from "lil-gui";
import {
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector3,
  WireframeGeometry,
} from "three";
import {
  measurePath,
  miterFrames,
  moldingProfile,
  type MoldingStyle,
  type PathMeasure,
  pointAtDistance,
  repeatAlongPath,
  slicePath,
  sweep,
  type Vec2,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Dentil Cornice",
  description:
    "STUDY — the Corner Anchoring findings at molding scale, in the assembly they came from. A classical " +
    "cornice carries BOTH repeat families at once: DENTILS are a notched band (the gap is a member, the " +
    "interdentil), and MODILLIONS are an applied repeat (their own construction, no gap member — which is " +
    "why they read as bolted on rather than cut from the run). Everything else is a plain swept course. " +
    "You design with WIDTH and GAP; the pitch is what comes out. A dentil has a width and an interdentil " +
    "has a gap, both real decisions with a proportion between them — set the pitch directly instead and " +
    "the gap becomes whatever is left over, swinging from solid to gaping as anything else moves. Both " +
    "courses are laid out INDEPENDENTLY from their own width and gap; they need not agree in the field, " +
    "only at the corners, and corner anchoring gives that to each of them for free. Two more things the " +
    "castle scale could not show. A section standing OFF its path must run `outer x tan(turn/2)` past a " +
    "convex corner, so the corner dentil is genuinely bigger and reaches over its neighbors — which are " +
    "dropped, and the block then CUT TO SUIT so its face sits exactly one gap from the first survivor, " +
    "the way a joiner does it. And an applied repeat needs a FRAME, not a point: a bracket has a BACK, so " +
    "unlike a baluster it cannot sit on the bisector without burying half of itself — a corner wants a " +
    "PAIR flanking it, one flat on each face.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  CORNICE      the crowning, projecting part of an entablature. What people mean by "crown molding".
//  FRIEZE       the flat band below the cornice. Where the wall stops and the ornament starts.
//  BED MOLD     the small molding under the corona, above the frieze.
//  DENTIL       a small block in a repeating course; INTERDENTIL is the gap. Latin for "little tooth".
//  CORONA       the broad flat projecting member — the part that actually throws water clear.
//  MODILLION    the scrolled bracket under the corona. A CORBEL is the structural word for any projecting
//               bracket; a CONSOLE or ANCON is an ornamental one taller than deep; a MUTULE is the flat
//               Doric version with no scroll. All family B: they have no gap member.
//  CYMA         the S-curved crowning member. RECTA hollow-over-bulge, REVERSA the other way up.
//
//  PITCH        center to center — an OUTPUT here, being width + gap. The number a course is laid out by,
//               never the number it is designed with.
//  BAY          the space between two modillions.

const UP = new Vector3(0, 1, 0);

/** How far the band behind the dentils stands off the wall — the face they are actually set out on. */
const BAND_FACE = 0.026;

/**
 * The wall line: an L by default, so there is an outside corner to inspect.
 *
 * **Wound so the sections project OUTWARD.** `miterFrames` builds its binormal as `cut × normal`, so with
 * `reference: UP` the profile's `y` lands on one particular side of the path — and the wrong side here is
 * not merely backwards, it is fatal: a cornice projecting INTO the corner makes every corner concave, and
 * a 28mm dentil cannot survive a concave miter 52mm deep. `MoldingGeometry` measures this against the
 * run's own middle and corrects it; a hand-built run has to wind itself correctly instead.
 */
const wallLine = (length: number, closed: boolean) => {
  const h = length / 2;
  return closed
    ? [
        new Vector3(-h, 0, h),
        new Vector3(h, 0, h),
        new Vector3(h, 0, -h),
        new Vector3(-h, 0, -h),
      ]
    : // The corner is placed NEAREST the camera, so the convex side — the side the cornice is on — is the
      // side you are looking at. Wound outward like the closed case.
      [new Vector3(-h, 0, h), new Vector3(h, 0, h), new Vector3(h, 0, -h)];
};

/**
 * A course as a section in the cornice's own axes: `x` runs UP, `y` runs OUT from the wall.
 *
 * Every member of a cornice is a band at some height standing off the wall by some amount, so one
 * rectangle plus a projection range describes nearly all of them. The two curved members borrow
 * {@link moldingProfile} instead.
 */
const course = (height: number, from: number, to: number): Vec2[] => [
  [0, from],
  [height, from],
  [height, to],
  [0, to],
];

/**
 * A classical section, mapped into the cornice's axes.
 *
 * `moldingProfile` draws a CORNER section: two backs meeting at the origin, `x` along one surface and `y`
 * along the other. Here `x` becomes height and `y` becomes projection, which lands the vertical back
 * against the wall either way — but `flare` decides which end the thing projects at:
 *
 * - `"top"` — flipped in x, so the horizontal back is at the TOP and the face swells as it rises. A crown.
 * - `"bottom"` — as drawn, so the horizontal back is at the bottom and the face swells downward. A bed mold.
 *
 * Flipping x mirrors the polygon, which reverses its winding, so the points are reversed to put it back.
 */
const classical = (
  style: MoldingStyle,
  height: number,
  from: number,
  projection: number,
  segments: number,
  flare: "top" | "bottom",
): Vec2[] => {
  const points = moldingProfile({ style, drop: height, projection, segments });
  if (flare === "bottom") return points.map(([px, py]) => [px, from + py] as Vec2);
  return points.map(([px, py]) => [height - px, from + py] as Vec2).reverse();
};

/**
 * A horizontal polyline moved OUTWARD, mitered at every vertex.
 *
 * **Which line a course is swept along decides how far it must run past a corner.** Two outer faces, each
 * parallel to its own wall at distance `r`, meet `r · tan(turn/2)` past the corner — there is nowhere else
 * for them to go. Sweep every course along the WALL and each one inherits the whole stack-up beneath it,
 * so a dentil 26mm deep sitting on a 26mm band reaches 52mm, and its corner block comes out twice the size
 * it should be. Sweep it along the band's own FACE and the reach is its own depth, which is what a real
 * corner dentil measures.
 *
 * The miter: at a vertex the two offset lines meet on the bisector of their outward normals, at
 * `distance / cos(half-angle)` — so a sharper turn pushes the vertex further out, exactly as a miter does.
 */
const offsetPath = (points: Vector3[], distance: number, closed: boolean): Vector3[] => {
  if (Math.abs(distance) < 1e-12) return points.map((p) => p.clone());
  const count = points.length;
  const segments = closed ? count : count - 1;
  const middle = points
    .reduce((sum, p) => sum.add(p.clone()), new Vector3())
    .divideScalar(count)
    .setY(0);

  // One outward normal per SEGMENT, judged against the run's own middle — the same test everything else
  // here uses, so a course cannot end up offset into the wall.
  const normals: Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % count]!;
    const tangent = b.clone().sub(a).setY(0).normalize();
    const normal = new Vector3(tangent.z, 0, -tangent.x);
    const mid = a.clone().add(b).multiplyScalar(0.5).setY(0);
    if (normal.dot(mid.sub(middle)) < 0) normal.negate();
    normals.push(normal);
  }

  return points.map((p, i) => {
    const incoming = closed ? normals[(i - 1 + segments) % segments]! : normals[i - 1];
    const outgoing = closed ? normals[i % segments]! : normals[i];
    // An open run's ends have only one segment to answer to.
    if (!incoming) return p.clone().addScaledVector(outgoing!, distance);
    if (!outgoing) return p.clone().addScaledVector(incoming, distance);

    const bisector = incoming.clone().add(outgoing);
    // A full reversal has no bisector; fall back rather than divide by zero.
    if (bisector.lengthSq() < 1e-12) return p.clone().addScaledVector(incoming, distance);
    bisector.normalize();
    return p.clone().addScaledVector(bisector, distance / bisector.dot(incoming));
  });
};

/** Sweep a section along a stretch of path, mitered at any corner it crosses. */
const runAlong = (points: Vector3[], profile: Vec2[], closed = false): BufferGeometry =>
  sweep(
    profile,
    miterFrames(
      points.map((position) => ({ position: position.clone(), tangent: new Vector3() })),
      { closed, reference: UP },
    ),
    { closed },
  );

/**
 * The direction the run is traveling at a distance along it.
 *
 * `pointAtDistance` answers WHERE, and for a rotationally symmetric item — a baluster — that is enough. A
 * modillion has a front, so it needs a frame, and this is the missing half. Sampling either side rather
 * than reading a segment's direction is deliberate: **at a corner the two samples straddle it, so the
 * result is the bisector** — which is exactly how a corner bracket should face.
 */
const tangentAt = (path: PathMeasure, distance: number, epsilon = 2e-3): Vector3 => {
  const a = path.closed ? distance - epsilon : Math.max(distance - epsilon, 0);
  const b = path.closed ? distance + epsilon : Math.min(distance + epsilon, path.length);
  return pointAtDistance(path, b).sub(pointAtDistance(path, a)).normalize();
};

/** A scrolled bracket: vertical against the wall, projecting, with an S-curve dying back to the wall. */
const modillionShape = (height: number, projection: number) => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, height);
  shape.lineTo(projection, height);
  // The scroll. Two control points pull the curve out under the corona and then back to the wall.
  shape.bezierCurveTo(projection * 0.62, height * 0.66, projection * 0.52, height * 0.22, 0, 0);
  return shape;
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x14171d,
    // FROM BELOW, because that is the only place a cornice is ever seen from. The stack tops out at about
    // 0.44 and the camera was at 0.90 — looking DOWN on the crown, which shows the one face a room never
    // presents and hides the soffit, the dentils' undersides and the modillion brackets, i.e. the subject.
    // `frameObject` keeps this as a DIRECTION and only dollies along it, so this sets the eye level, not
    // the distance.
    cameraPosition: [1.1, -0.5, 1.5],
  });
  const { scene, camera, dispose } = handle;

  // A long lens: a cornice is a stack of shallow shadow lines, and perspective foreshortening is exactly
  // what destroys the reading of one.
  camera.fov = 24;
  camera.near = 0.005;
  camera.updateProjectionMatrix();

  const key = new DirectionalLight(0xfff6ea, 1.3);
  key.position.set(1.2, 1.4, 1.5);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-1, -0.4, 0.8);
  scene.add(key, bounce);

  const plaster = new MeshStandardMaterial({
    color: 0xefe9dd,
    roughness: 0.92,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const toothed = new MeshStandardMaterial({
    color: 0xe4c79a,
    roughness: 0.88,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const bracket = new MeshStandardMaterial({
    color: 0xd39a63,
    roughness: 0.85,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    length: 1.2,
    closed: false,
    segments: 6,

    friezeHeight: 0.16,
    bedStyle: "cyma" as MoldingStyle,

    dentils: true,
    dentilWidth: 0.028,
    dentilGap: 0.024,
    dentilHeight: 0.05,
    dentilDepth: 0.026,

    modillions: true,
    modillionGap: 0.19,
    cornerStyle: "pair" as "pair" | "bisector",
    modillionHeight: 0.075,
    modillionProjection: 0.07,
    modillionWidth: 0.032,

    crownStyle: "ogee" as MoldingStyle,
    crownHeight: 0.09,
    crownProjection: 0.055,

    wireframe: false,
    dentilOut: "",
    modillionOut: "",
    alignOut: "",
    swallowOut: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    const seen = new Set<BufferGeometry>();
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        seen.add(child.geometry);
        stage.remove(child);
      }
    }
    for (const geometry of seen) geometry.dispose();
  };

  const add = (geometry: BufferGeometry, material: MeshStandardMaterial) => {
    stage.add(new Mesh(geometry, material));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));
  };

  const rebuild = () => {
    clear();

    const points = wallLine(params.length, params.closed);
    const path = measurePath(points, { closed: params.closed });
    // Outward is away from the run's own middle — the same test `MoldingGeometry` makes, and the reason a
    // modillion on the far side of an L does not face into the wall.
    const middle = points
      .reduce((sum, p) => sum.add(p), new Vector3())
      .divideScalar(points.length);

    // ── The continuous courses. Every one is the same sweep with a different section and offset. ──────
    const friezeTop = params.friezeHeight;
    const bedHeight = 0.045;
    const bedTop = friezeTop + bedHeight;
    const dentilTop = bedTop + params.dentilHeight;
    const coronaHeight = 0.035;
    const coronaTop = dentilTop + coronaHeight;

    const at = (y: number) => points.map((p) => p.clone().setY(y));

    // Frieze: the plain band the whole cornice sits on.
    add(runAlong(at(0), course(params.friezeHeight, 0, 0.014), params.closed), plaster);
    // Bed mold: flares DOWNWARD onto the frieze.
    add(
      runAlong(
        at(friezeTop),
        classical(params.bedStyle, bedHeight, 0.014, 0.024, params.segments, "bottom"),
        params.closed,
      ),
      plaster,
    );
    // The band the dentils stand on and are recessed into — what makes the interdentil read as a gap you
    // can see INTO rather than a space between separate blocks.
    add(runAlong(at(bedTop), course(params.dentilHeight, 0.014, 0.026), params.closed), plaster);
    // Corona: the broad flat that oversails the dentils.
    add(
      runAlong(at(dentilTop), course(coronaHeight, 0.014, BAND_FACE + params.dentilDepth + 0.002), params.closed),
      plaster,
    );
    // Crown: flares UPWARD off the corona.
    add(
      runAlong(
        at(coronaTop),
        classical(
          params.crownStyle,
          params.crownHeight,
          BAND_FACE + params.dentilDepth + 0.006,
          params.crownProjection,
          params.segments,
          "top",
        ),
        params.closed,
      ),
      plaster,
    );

    // ── THE SETTING-OUT, ON THE FACE THE DENTILS ACTUALLY SIT ON. ───────────────────────────────────
    //
    // Width and GAP are the design decisions; the PITCH is their sum and comes out. And the run is the
    // BAND'S FACE, not the wall — see `offsetPath`. Measuring arc length there is also how it is really
    // done: you set dentils out on the face you can see, so the gap you draw is the gap you get, and the
    // corner they land on is the visible corner rather than one buried 26mm behind it.
    const half = params.dentilWidth / 2;
    const face = offsetPath(points, BAND_FACE, params.closed);
    const facePath = measurePath(face, { closed: params.closed });
    const laid = repeatAlongPath(facePath, {
      pitch: params.dentilWidth + params.dentilGap,
      anchor: "corners",
    });
    const gap = laid.pitch - params.dentilWidth;

    // A section standing off its path still runs `depth · tan(turn/2)` past a convex corner — but that is
    // now its OWN depth, so the corner block comes out a little over one dentil wide instead of two and a
    // half, and nothing needs swallowing at sane proportions. The rule stays because extreme settings can
    // still bury a neighbor, and a buried dentil is worse than a missing one.
    const vertexIndices = params.closed
      ? face.map((_, i) => i)
      : face.map((_, i) => i).slice(1, -1); // an open run's ENDS are square cuts, not miters
    const corners = vertexIndices.map((i) => {
      const n = face.length;
      const a = face[i]!.clone().sub(face[(i - 1 + n) % n]!).normalize();
      const b = face[(i + 1) % n]!.clone().sub(face[i]!).normalize();
      const turn = Math.acos(Math.min(1, Math.max(-1, a.dot(b))));
      return { at: facePath.distances[i]!, reach: params.dentilDepth * Math.tan(turn / 2) };
    });
    const cornerAt = new Map(corners.map((c) => [c.at, c]));

    const signedTo = (from: number, to: number) => {
      let d = to - from;
      if (!params.closed) return d;
      if (d > facePath.length / 2) d -= facePath.length;
      if (d < -facePath.length / 2) d += facePath.length;
      return d;
    };

    const dropped = new Set<number>();
    // Per corner, per side.
    //
    // A neighbor only has to GO if it is actually inside the block — `near edge < reach`. Demanding a
    // full nominal gap as well drops a dentil that fits perfectly well, and trades a slightly tight gap
    // for a conspicuously large one. The photograph settles it: real courses run up to the corner block
    // with a tighter interdentil, they do not leave a hole.
    //
    // The block is only CUT TO SUIT when something did have to go, since then the survivor is a whole
    // pitch away and the raw miter would leave a ragged space.
    const extents = new Map<number, { back: number; forward: number }>();
    for (const { at, reach } of corners) {
      const side = (sign: 1 | -1) => {
        const ordered = laid.centers
          .filter((c) => c !== at)
          .map((c) => ({ c, d: signedTo(at, c) * sign }))
          .filter((x) => x.d > 1e-9)
          .sort((a, b) => a.d - b.d);
        let removed = false;
        for (const { c, d } of ordered) {
          if (d - half >= reach - 1e-9) return removed ? Math.max(half, d - half - gap) : half;
          dropped.add(c);
          removed = true;
        }
        return half;
      };
      extents.set(at, { forward: side(1), back: side(-1) });
    }

    if (params.dentils) {
      for (const center of laid.centers) {
        if (dropped.has(center)) continue;
        const extent = extents.get(center);
        add(
          runAlong(
            slicePath(facePath, center - (extent ? extent.back : half), center + (extent ? extent.forward : half))
              .map((p) => p.clone().setY(bedTop)),
            course(params.dentilHeight, 0, params.dentilDepth),
          ),
          toothed,
        );
      }
    }

    // ── B — MODILLIONS. Only the CENTER — plus a facing, which a point alone cannot give. ─────────────
    //
    // A bracket HAS A BACK, and that changes what a corner means for it. A baluster or a newel is happy
    // sitting ON a corner facing the bisector, because it is rotationally symmetric. A modillion's flat
    // back has to lie against a wall, so on the bisector half of it is buried in the masonry. `pair`
    // replaces the corner bracket with two flanking it, one on each face — which is what is actually
    // built, and a distinction the castle study could never have surfaced.
    const bays = repeatAlongPath(path, {
      pitch: params.modillionWidth + params.modillionGap,
      anchor: "corners",
    });
    // The corners as THIS run measures them. The dentils ride the band's offset face, whose arc lengths
    // differ from the wall's at every corner — so the modillions need their own table, not the dentils'.
    const modillionCorners = new Set(
      (params.closed ? points.map((_, i) => i) : points.map((_, i) => i).slice(1, -1)).map(
        (i) => path.distances[i]!,
      ),
    );
    const flank = params.modillionWidth * 1.1;
    const modillions =
      params.cornerStyle === "bisector"
        ? bays.centers
        : bays.centers.flatMap((c) => (modillionCorners.has(c) ? [c - flank, c + flank] : [c]));

    if (params.modillions) {
      // One geometry, placed many times. Centered on its width, and grown from the wall in +x.
      const shape = new ExtrudeGeometry(
        modillionShape(params.modillionHeight, params.modillionProjection),
        { depth: params.modillionWidth, bevelEnabled: false, curveSegments: params.segments },
      ).translate(0, 0, -params.modillionWidth / 2);

      for (const center of modillions) {
        // Tucked UP UNDER the bed mold, overlaying it. The brackets reach further out than the bed mold
        // does, so they read as let into it — which is the wanted look. The corner was the only real
        // problem, and `cornerStyle: "pair"` is what fixes that.
        const position = pointAtDistance(path, center).setY(bedTop - params.modillionHeight - 0.004);
        const tangent = tangentAt(path, center);
        // Outward, in plan: the tangent turned 90°, flipped if it happens to point at the run's middle.
        const outward = new Vector3(tangent.z, 0, -tangent.x).normalize();
        if (outward.dot(position.clone().sub(middle).setY(0)) < 0) outward.negate();

        const mesh = new Mesh(shape, bracket);
        mesh.applyMatrix4(new Matrix4().makeBasis(outward, UP, tangent));
        mesh.position.copy(position);
        stage.add(mesh);
      }
    }

    params.dentilOut = `${laid.centers.length - dropped.size} dentils · pitch ${laid.pitch.toFixed(4)} (${params.dentilWidth} + ${gap.toFixed(4)} gap)`;
    params.modillionOut = `${modillions.length} modillions · pitch ${bays.pitch.toFixed(4)}`;
    const grown = [...extents.values()].map((e) => e.forward).find((e) => e > half + 1e-9);
    const blockFace = (corners[0]?.reach ?? 0) + half;
    params.swallowOut = `${dropped.size} swallowed · corner block ${(blockFace / params.dentilWidth).toFixed(2)}× a field dentil${grown ? " (cut to suit)" : ""}`;
    const missed = corners.filter(({ at }) => !laid.centers.some((d) => Math.abs(d - at) < 1e-6)).length;
    params.alignOut =
      missed === 0 ? "locked — both courses land on every corner" : `${missed} corner(s) unset`;

    frameObject(handle, stage, { dolly: false });
  };
  rebuild();
  frameObject(handle, stage, { fit: 1.5 });

  const STYLES: Record<string, MoldingStyle> = {
    "Cove (cavetto)": "cove",
    Ovolo: "ovolo",
    Chamfer: "chamfer",
    "Ogee (cyma recta)": "ogee",
    "Cyma (reversa)": "cyma",
    Scotia: "scotia",
    "Fillet (plain band)": "fillet",
    "Step (corbel)": "step",
  };

  const gui = new GUI();
  gui.title("Dentil Cornice");

  const dentil = gui.addFolder("Dentils — notched band");
  dentil.add(params, "dentils").name("Show").onChange(rebuild);
  // Center to center. The gap — the interdentil — is what is left after the width, never a knob.
  // Width and GAP are the design decisions; the pitch is their sum and is reported, not set.
  dentil.add(params, "dentilGap", 0.004, 0.1, 0.002).name("Gap (interdentil)").onChange(rebuild);
  dentil.add(params, "dentilWidth", 0.008, 0.08, 0.002).name("Width").onChange(rebuild);
  dentil.add(params, "dentilHeight", 0.02, 0.12, 0.002).name("Height").onChange(rebuild);
  // Its OWN depth off the band, which is also what sets its reach past a corner — not its distance from
  // the wall, which is what made the corner block twice the size it should have been.
  dentil.add(params, "dentilDepth", 0.008, 0.08, 0.002).name("Depth").onChange(rebuild);
  dentil.open();

  const modillion = gui.addFolder("Modillions — applied repeat");
  modillion.add(params, "modillions").name("Show").onChange(rebuild);
  // The classical alignment rule, as one integer. Every corner stays locked whatever you choose.
  // Same model as the dentils, and laid out independently — the two courses only have to agree at the
  // corners, which corner anchoring gives each of them on its own.
  modillion.add(params, "modillionGap", 0.04, 0.5, 0.01).name("Gap Between").onChange(rebuild);
  modillion
    .add(params, "cornerStyle", { "Pair — flanking the corner": "pair", "Bisector — one on the corner": "bisector" })
    .name("At A Corner")
    .onChange(rebuild);
  modillion.add(params, "modillionHeight", 0.03, 0.18, 0.005).name("Height").onChange(rebuild);
  modillion.add(params, "modillionProjection", 0.02, 0.16, 0.005).name("Projection").onChange(rebuild);
  modillion.add(params, "modillionWidth", 0.01, 0.08, 0.002).name("Width").onChange(rebuild);
  modillion.open();

  const assembly = gui.addFolder("Assembly");
  assembly.add(params, "crownStyle", STYLES).name("Crown").onChange(rebuild);
  assembly.add(params, "bedStyle", STYLES).name("Bed Mold").onChange(rebuild);
  assembly.add(params, "crownHeight", 0.03, 0.2, 0.005).name("Crown Height").onChange(rebuild);
  assembly.add(params, "crownProjection", 0.02, 0.15, 0.005).name("Crown Projection").onChange(rebuild);
  assembly.add(params, "friezeHeight", 0.05, 0.4, 0.01).name("Frieze Height").onChange(rebuild);
  assembly.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  // Off by default: an L shows the outside corner, which is where setting-out is judged.
  inspect.add(params, "closed").name("Closed Run").onChange(rebuild);
  inspect.add(params, "length", 0.6, 2.4, 0.05).name("Wall Length").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "dentilOut").name("Dentils").listen().disable();
  readout.add(params, "modillionOut").name("Modillions").listen().disable();
  readout.add(params, "swallowOut").name("Swallowed").listen().disable();
  readout.add(params, "alignOut").name("Corners").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    plaster.dispose();
    toothed.dispose();
    bracket.dispose();
    wire.dispose();
    dispose();
  };
}
