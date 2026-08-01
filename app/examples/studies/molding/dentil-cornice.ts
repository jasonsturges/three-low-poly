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

export const meta = {
  title: "Dentil Cornice",
  description:
    "STUDY — the Corner Anchoring findings at molding scale, in the assembly they came from. A classical " +
    "cornice carries BOTH repeat families at once: DENTILS are a notched band (the gap is a member, the " +
    "interdentil), and MODILLIONS are an applied repeat (their own construction, no gap member — which is " +
    "why they read as bolted on rather than cut from the run). Everything else is a plain swept course. " +
    "The modillions are DERIVED from every Nth dentil rather than laid out independently, because two " +
    "corner-anchored courses at a multiple pitch do not automatically agree — each rounds its own segment " +
    "separately. Deriving one from the other is how a joiner does it, and it is the only way the two " +
    "rhythms stay locked at every corner. This also surfaces the machinery's next gap: an applied repeat " +
    "needs a FRAME, not a point, because a modillion has to face outward — and at a corner that frame is " +
    "the bisector, which is exactly right.",
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
//  Classical rule of thumb: modillions align with dentils, at a whole multiple of the dentil pitch. That
//  alignment is the reason this study derives one course from the other.

const UP = new Vector3(0, 1, 0);

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
 * The direction the run is travelling at a distance along it.
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
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.5, 0.9, 1.9],
  });

  camera.fov = 24;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0.2, 0);
  controls.update();

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
    dentilPitch: 0.055,
    dentilWidth: 0.028,
    dentilHeight: 0.05,
    dentilProjection: 0.038,

    modillions: true,
    modillionEvery: 4,
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
      runAlong(at(dentilTop), course(coronaHeight, 0.014, params.dentilProjection + 0.014), params.closed),
      plaster,
    );
    // Crown: flares UPWARD off the corona.
    add(
      runAlong(
        at(coronaTop),
        classical(
          params.crownStyle,
          params.crownHeight,
          params.dentilProjection + 0.004,
          params.crownProjection,
          params.segments,
          "top",
        ),
        params.closed,
      ),
      plaster,
    );

    // ── A — DENTILS. The interval, swept. Corner blocks come back as L's for free. ────────────────────
    const repeat = repeatAlongPath(path, { pitch: params.dentilPitch, anchor: "corners" });
    const half = params.dentilWidth / 2;

    if (params.dentils) {
      for (const center of repeat.centers) {
        add(
          runAlong(
            slicePath(path, center - half, center + half).map((p) => p.clone().setY(bedTop)),
            course(params.dentilHeight, 0.026, params.dentilProjection + 0.014),
          ),
          toothed,
        );
      }
    }

    // ── B — MODILLIONS. Only the CENTER — plus a facing, which a point alone cannot give. ─────────────
    //
    // DERIVED from the dentils, not laid out separately. Two corner-anchored courses at a multiple pitch
    // each round their own segments independently, so they drift apart; taking every Nth dentil locks the
    // rhythms together and puts a modillion on every corner, because a corner is always a dentil.
    const every = Math.max(1, Math.round(params.modillionEvery));
    const bySegment: number[][] = [];
    let segment = 0;
    for (const center of repeat.centers) {
      while (segment + 1 < path.distances.length - 1 && center >= path.distances[segment + 1]! - 1e-9) {
        segment++;
      }
      (bySegment[segment] ??= []).push(center);
    }
    const modillions = bySegment.flatMap((list) => list.filter((_, i) => i % every === 0));
    // An open run's FAR END is a corner too, and it is the last dentil of the last segment rather than the
    // first of a new one — so counting from each segment's start walks straight past it.
    if (!params.closed) {
      const last = repeat.centers[repeat.centers.length - 1]!;
      if (!modillions.some((m) => Math.abs(m - last) < 1e-9)) modillions.push(last);
    }

    if (params.modillions) {
      // One geometry, placed many times. Centered on its width, and grown from the wall in +x.
      const shape = new ExtrudeGeometry(
        modillionShape(params.modillionHeight, params.modillionProjection),
        { depth: params.modillionWidth, bevelEnabled: false, curveSegments: params.segments },
      ).translate(0, 0, -params.modillionWidth / 2);

      for (const center of modillions) {
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

    params.dentilOut = `${repeat.centers.length} dentils · asked ${params.dentilPitch.toFixed(4)}, got ${repeat.pitch.toFixed(4)}`;
    params.modillionOut = `${modillions.length} modillions · every ${every}th dentil`;
    // Both courses must carry a member at every corner, or the assembly reads as mis-set-out.
    const corners = path.distances.slice(0, params.closed ? points.length : points.length);
    const missed = corners.filter((c) => !modillions.some((m) => Math.abs(m - c) < 1e-6)).length;
    params.alignOut =
      missed === 0 ? "locked — a modillion on every corner" : `${missed} corner(s) without a modillion`;
  };
  rebuild();

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
  dentil.add(params, "dentilPitch", 0.02, 0.16, 0.002).name("Pitch").onChange(rebuild);
  dentil.add(params, "dentilWidth", 0.008, 0.08, 0.002).name("Width").onChange(rebuild);
  dentil.add(params, "dentilHeight", 0.02, 0.12, 0.002).name("Height").onChange(rebuild);
  dentil.add(params, "dentilProjection", 0.01, 0.1, 0.002).name("Projection").onChange(rebuild);
  dentil.open();

  const modillion = gui.addFolder("Modillions — applied repeat");
  modillion.add(params, "modillions").name("Show").onChange(rebuild);
  // The classical alignment rule, as one integer. Every corner stays locked whatever you choose.
  modillion.add(params, "modillionEvery", 1, 10, 1).name("Every Nth Dentil").onChange(rebuild);
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
