import GUI from "lil-gui";
import {
  BoxGeometry,
  ExtrudeGeometry,
  Shape,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  WireframeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { miterFrames, mulberry32, rectProfile, sweep } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Flying Buttress",
  description:
    "STUDY — the other kind. The buttress study puts a mass AGAINST a wall; this one detaches it and " +
    "carries the thrust across open air to it. That span is the whole point, and it is why a Gothic nave " +
    "can have windows where a Romanesque one needs wall. " +
    "Three members and none of them is decoration. The FLYER is an arch springing from the pier and " +
    "landing on the wall at the height the vault pushes — it RISES above its own chord, because an arch " +
    "carrying compression must be convex upward. A curve that sags is a rope. The COPING rakes above it, shedding water off the flyer's back. And " +
    "the PINNACLE on the pier is BALLAST: its weight swings the resultant thrust downward so it stays " +
    "inside the pier's base. Take Pinnacle Height to 0 and the building does not change, which is exactly " +
    "the point — the thing that looks most ornamental is the one doing the arithmetic. " +
    "Drag Flyer Rise to 0 and it becomes a straight strut: still spans, no longer an arch, and now " +
    "working in bending rather than compression, which is not what stone does.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  FLYER        the arch itself, springing from the pier and landing on the wall. Also FLYING ARCH.
//  PIER         the detached mass the flyer lands on. It is the actual buttress; the arch only delivers
//               thrust to it.
//  COPING       the raking member above the flyer, throwing water clear of its back.
//  SPANDREL     the space between flyer and coping. Left open here; often filled with tracery.
//  PINNACLE     the spire on the pier. Ballast, not ornament — weight added at the top swings the
//               resultant thrust vector downward until it falls inside the pier's base. A pier that
//               would otherwise overturn is saved by putting MORE weight on it, which is unintuitive
//               enough to be worth stating twice.
//  RAMPANT      an arch whose two springings sit at DIFFERENT heights. Every flyer is one — low on the
//               pier, high on the wall — which is why it is not a half of an ordinary arch.
//  TANGENT /    a straight top that just touches the arch is TANGENT; one cutting across it end to end is
//  SECANT       a SECANT. A flyer's beam rests on its arch, so it wants the first.
//  SPRINGING    where the arch leaves its support. The flyer springs low on the pier.
//  LANDING      where it meets the wall — set at the height the vault's thrust actually arrives.
//  INTRADOS     the arch's underside. EXTRADOS is its back.
//  STRING       the horizontal band round a pier at each stage. Ornamental here, structural in that it
//  COURSE       marks where the pier sets back.

/**
 * A circular arc through two points with a given sag.
 *
 * Circular rather than a Bézier, because an arch's intrados IS an arc of a circle and the difference shows
 * at the springing — a Bézier leaves its endpoints at the wrong angle, so the flyer meets its pier on a
 * visible kink instead of tangentially.
 *
 * `rise` is the arch's height ABOVE its chord, measured at the midpoint — the same quantity an arch's rise
 * always is. **Not a sag.** A sagging curve is a rope: it works in tension, which is the one thing masonry
 * cannot do. An arch carries compression and is therefore convex UPWARD, and getting that sign wrong gives
 * a shape that reads instantly as slack rather than sprung.
 *
 * The rise also sets the SPRINGING TANGENT, which is the number to watch. A deep rise leaves the pier
 * steeply — at this study's proportions, 0.3 springs at −54° and 0.9 at −88°, which is vertical. And a
 * vertical springing defeats an embedded end, because extending along that tangent goes DOWN, not IN.
 */
const arcThrough = (from: Vector3, to: Vector3, rise: number, segments: number): Vector3[] => {
  const chord = to.clone().sub(from);
  const length = chord.length();
  if (length < 1e-9 || Math.abs(rise) < 1e-6) {
    // A straight strut. Still spans, but it works in BENDING rather than compression, which is the one
    // thing masonry cannot do.
    return Array.from({ length: segments + 1 }, (_, i) => from.clone().lerp(to, i / segments));
  }

  // Perpendicular to the chord, in the vertical plane the flyer spans.
  const normal = new Vector3(-chord.y, chord.x, 0).normalize();
  const mid = from.clone().add(to).multiplyScalar(0.5).addScaledVector(normal, -rise);

  // Circle through three points: the two ends and the sagged midpoint. Solved as the intersection of the
  // two chords' perpendicular bisectors, which is stable as long as they are not collinear — and they are
  // not, because `rise` just moved the middle one off the line.
  const ax = from.x, ay = from.y, bx = mid.x, by = mid.y, cx = to.x, cy = to.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) {
    return Array.from({ length: segments + 1 }, (_, i) => from.clone().lerp(to, i / segments));
  }
  const ux =
    ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

  const center = new Vector3(ux, uy, from.z);
  const radius = center.distanceTo(from);
  let a0 = Math.atan2(ay - uy, ax - ux);
  const a2 = Math.atan2(cy - uy, cx - ux);
  const a1 = Math.atan2(by - uy, bx - ux);

  // Walk the short way THROUGH the midpoint, so the arc is the one that actually sags rather than its
  // complement going the long way round the circle.
  const wrap = (angle: number) => {
    let t = angle;
    while (t - a0 > Math.PI) t -= Math.PI * 2;
    while (t - a0 < -Math.PI) t += Math.PI * 2;
    return t;
  };
  const mAngle = wrap(a1);
  let end = wrap(a2);
  if ((mAngle - a0) * (end - a0) < 0 || Math.abs(mAngle - a0) > Math.abs(end - a0)) {
    end = end + (end > a0 ? -Math.PI * 2 : Math.PI * 2);
  }

  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = a0 + (end - a0) * (i / segments);
    return new Vector3(ux + Math.cos(t) * radius, uy + Math.sin(t) * radius, from.z);
  });
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x1b2029,
    cameraPosition: [5.5, 4.2, 7.5],
  });

  controls.target.set(0, 3, 0);
  controls.update();

  const key = new DirectionalLight(0xfff4e6, 1.5);
  key.position.set(4, 5, 4);
  const bounce = new DirectionalLight(0x8fa8c8, 0.4);
  bounce.position.set(-4, 1, -3);
  scene.add(key, bounce);

  const stone = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    span: 3.2,
    wallHeight: 7,
    wallThickness: 0.5,
    pierWidth: 0.7,
    pierHeight: 5.4,

    springing: 2.6,
    landing: 4.6,
    flyerRise: 0.3,
    flyerWidth: 0.34,
    flyerEmbed: 0.22,
    segments: 14,

    topCurve: 0,
    archThickness: 0.22,

    coping: true,
    copingDepth: 0.16,
    copingOverhang: 0.06,

    pinnacleHeight: 1.5,
    stringCourses: true,

    color: "#a99f8c",
    colorVariance: 0.05,
    seed: 0x2c1a,

    wireframe: false,
    geometryOut: "",
    thrust: "",
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

    const random = mulberry32(params.seed);
    const signed = (amount: number) => (random() - 0.5) * 2 * amount;
    const base = new Color(params.color);
    const tint = new Color();
    const parts: BufferGeometry[] = [];

    const paint = (geometry: BufferGeometry, spread = params.colorVariance) => {
      // `mergeGeometries` needs every input to agree on whether it has an index — all or none. This scene
      // mixes both: `BoxGeometry` and `ConeGeometry` arrive INDEXED, while `ExtrudeGeometry` and anything
      // from `sweep` arrive NON-indexed. Normalizing to non-indexed is the right way round rather than the
      // other, because flat shading and per-vertex color both want unshared vertices anyway — an indexed
      // box would have one vertex serving three faces, and one color serving all three with it.
      const flat = geometry.index ? geometry.toNonIndexed() : geometry;
      if (flat !== geometry) geometry.dispose();

      tint.copy(base).offsetHSL(signed(spread) / 4, signed(spread) / 2, signed(spread));
      const count = flat.attributes.position!.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = tint.r;
        colors[i * 3 + 1] = tint.g;
        colors[i * 3 + 2] = tint.b;
      }
      flat.setAttribute("color", new BufferAttribute(colors, 3));
      parts.push(flat);
    };

    // The nave wall, at x = 0, and the detached pier out at x = span.
    const wallFace = params.wallThickness / 2;
    const wall = new BoxGeometry(params.wallThickness, params.wallHeight, 2.2);
    wall.translate(0, params.wallHeight / 2, 0);
    paint(wall, params.colorVariance * 0.6);

    const pierX = wallFace + params.span;
    const pier = new BoxGeometry(params.pierWidth, params.pierHeight, params.pierWidth);
    pier.translate(pierX, params.pierHeight / 2, 0);
    paint(pier, params.colorVariance * 0.6);

    if (params.stringCourses) {
      // The bands marking each stage. Ornamental at this scale, but they are where a real pier sets back.
      for (const t of [0.32, 0.62, 0.88]) {
        const band = new BoxGeometry(params.pierWidth * 1.12, 0.09, params.pierWidth * 1.12);
        band.translate(pierX, params.pierHeight * t, 0);
        paint(band, params.colorVariance * 0.5);
      }
    }

    // THE FLYER. Springs low on the pier's inner face, lands on the wall at the height the vault pushes.
    const from = new Vector3(pierX - params.pierWidth / 2, params.springing, 0);
    const to = new Vector3(wallFace, params.landing, 0);
    const arc = arcThrough(from, to, params.flyerRise, Math.max(3, Math.round(params.segments)));

    // EMBED BOTH ENDS. An arch that stops at its support's FACE leaves its whole end cap hanging in open
    // air, and the swept section pokes past the pier besides. Extending each end along its own tangent
    // buries the cap inside solid material — the same fix the plain buttress uses on its back, which I
    // applied there and forgot here.
    const extend = (a: Vector3, b: Vector3) => a.clone().addScaledVector(a.clone().sub(b).normalize(), params.flyerEmbed);
    const path = [
      extend(arc[0]!, arc[1]!),
      ...arc,
      extend(arc[arc.length - 1]!, arc[arc.length - 2]!),
    ];

    // THE FLYER IS A SOLID MASS, not a slender arch with a separate rail above it. Its UNDERSIDE is the
    // arch — the intrados, and the line the thrust actually runs down — and its top is a flatter rake.
    // Everything between is fill. Drawing it as one closed elevation and extruding is both truer and
    // simpler than sweeping two members and then keeping them from colliding, which is what the previous
    // version spent all its effort on.
    //
    // The top edge is the arch OFFSET UPWARD, by a depth that tapers from the pier to the wall. That gives
    // the mass its wedge — deep where the thrust arrives, thin where it leaves — and it also straightens
    // the top relative to the bottom, which is what the references show. Set the two depths equal and the
    // top runs parallel to the arch instead.
    const last = path.length - 1;

    // THE TOP EDGE — a beam resting on a rainbow.
    //
    // The arch is a band of constant thickness: the intrados is `path`, and the EXTRADOS is that offset up
    // by `archThickness`. The beam is then the straight line through the extrados' two ENDS, lifted until
    // it just touches — TANGENT, not a secant cutting across. What that leaves between them is the
    // SPANDREL, and filling it is what makes the flyer one solid piece rather than a rib and a rail.
    //
    // The lift is what makes it tangent, and it is not an adjustment: a chord of a CONVEX curve always
    // falls below it, so the line has to rise by exactly its worst shortfall and no more. At that lift it
    // meets the extrados at one point — which is the definition of tangency, arrived at by measuring
    // rather than by solving for it.
    const extradosY = (i: number) => path[i]!.y + params.archThickness;

    const startX = path[0]!.x;
    const endX = path[last]!.x;
    // Interpolated on X, not on the sample INDEX. The arc is sampled at equal ANGLES, so its points are
    // not equally spaced along x — walking the index linearly gives a line that is straight in parameter
    // space and visibly bent in the drawing, which is the one thing a flat beam must not be.
    const chord = (x: number) =>
      Math.abs(endX - startX) < 1e-9
        ? extradosY(0)
        : extradosY(0) + (extradosY(last) - extradosY(0)) * ((x - startX) / (endX - startX));

    let lift = 0;
    for (let i = 0; i <= last; i++) lift = Math.max(lift, extradosY(i) - chord(path[i]!.x));

    // `topCurve` blends the tangent beam toward the extrados itself. At 1 the spandrel closes entirely and
    // the flyer becomes a pure curved band of constant thickness; at 0 it is a beam on a rainbow.
    const top = path.map((point, i) => {
      const beam = chord(point.x) + lift;
      return new Vector3(point.x, beam + (extradosY(i) - beam) * params.topCurve, point.z);
    });

    const outline = new Shape();
    outline.moveTo(path[0]!.x, path[0]!.y);
    for (const point of path.slice(1)) outline.lineTo(point.x, point.y);
    for (let i = top.length - 1; i >= 0; i--) outline.lineTo(top[i]!.x, top[i]!.y);
    outline.closePath();

    // The elevation is already drawn in the plane the flyer spans, so the extrusion runs straight across
    // its width with no rotation — unlike the plain buttress, whose elevation faces the other way.
    const flyer = new ExtrudeGeometry(outline, {
      depth: params.flyerWidth,
      bevelEnabled: false,
      curveSegments: 1,
    });
    flyer.translate(0, 0, -params.flyerWidth / 2);
    paint(flyer);

    if (params.coping) {
      // TRIM, not a member. A course laid along the flyer's back, standing a little proud of it on both
      // sides so water leaves the stone at a drip rather than running down the face.
      const rake = sweep(
        // `rectProfile(width, thickness)` puts WIDTH on the binormal and THICKNESS on the normal. With the
        // path in the XY plane and the reference on +Z, the binormal comes out VERTICAL — so passing the
        // coping's span first made it a tall blade hanging below the arch instead of a band lying on it.
        rectProfile(params.copingDepth, params.flyerWidth + params.copingOverhang * 2),
        miterFrames(
          top.map((position) => ({
            position: position.clone().add(new Vector3(0, params.copingDepth / 2, 0)),
            tangent: new Vector3(),
          })),
          { reference: new Vector3(0, 0, 1) },
        ),
      );
      paint(rake);
    }

    if (params.pinnacleHeight > 0.01) {
      // BALLAST. Weight at the top of the pier swings the resultant thrust downward until it falls inside
      // the base. The most ornamental-looking member is the one doing the arithmetic.
      const cap = new BoxGeometry(params.pierWidth * 1.2, 0.16, params.pierWidth * 1.2);
      cap.translate(pierX, params.pierHeight + 0.08, 0);
      paint(cap, params.colorVariance * 0.5);
      const spire = new ConeGeometry(params.pierWidth * 0.62, params.pinnacleHeight, 4);
      spire.rotateY(Math.PI / 4);
      spire.translate(pierX, params.pierHeight + 0.16 + params.pinnacleHeight / 2, 0);
      paint(spire, params.colorVariance * 0.5);
    }

    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (merged) {
      stage.add(new Mesh(merged, stone));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(merged), wire));
    }

    const tris = merged ? merged.getAttribute("position").count / 3 : 0;
    params.geometryOut = `${path.length} arc samples · ${tris.toLocaleString()} tris · 1 draw call`;
    // The flyer's chord angle: how steeply the thrust arrives. Shallower is a longer reach and a heavier pier.
    const rise = params.landing - params.springing;
    const angle = (Math.atan2(rise, params.span) * 180) / Math.PI;
    // How the flyer LEAVES the pier. Near horizontal reads as springing from it; near vertical reads as
    // sliding down its face, and is also where an embedded end stops being able to bite.
    const heading = path[1]!.clone().sub(path[0]!);
    const spring = (Math.atan2(heading.y, -heading.x) * 180) / Math.PI;
    params.thrust = `chord ${angle.toFixed(0)}° · springs at ${spring.toFixed(0)}° ${Math.abs(spring) > 55 ? "— steep, it slides rather than springs" : "— square to the pier"} · rise ${params.flyerRise.toFixed(2)}${Math.abs(params.flyerRise) < 0.01 ? " (a strut, not an arch)" : ""}`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Flying Buttress");

  const flyerFolder = gui.addFolder("Flyer");
  // Where it leaves the pier, and where it meets the wall. The landing is set by where the vault pushes.
  flyerFolder.add(params, "springing", 0.5, 8, 0.1).name("Springing").onChange(rebuild);
  flyerFolder.add(params, "landing", 0.5, 8, 0.1).name("Landing").onChange(rebuild);
  // Take it to 0 and the arch becomes a straight strut — still spans, but works in bending, which is the
  // one thing stone cannot do.
  // Capped where the arc stops marching toward the wall: past about 1.5 it curls back on itself, which is
  // no longer a shape an arch can be.
  // The arch's height ABOVE its chord. NOT a sag — a sagging curve is a rope, working in tension, which is
  // the one thing masonry cannot do. Deeper rises leave the pier more steeply; watch the springing angle
  // in the Readout, and note that past about −55° an embedded end stops being able to bite.
  flyerFolder.add(params, "flyerRise", 0, 1.2, 0.05).name("Flyer Rise").onChange(rebuild);
  flyerFolder.add(params, "flyerWidth", 0.1, 1, 0.02).name("Flyer Width").onChange(rebuild);
  // 0 is a straight beam the arch rises to meet; 1 offsets the arch so the top reads as a second arch.
  // Between them is where a real flyer's back usually sits — mostly straight, carrying a little of the
  // arch's curve. A switch could not express that, which is why this is a slider.
  // 0 is a straight beam resting TANGENT on the arch, with the spandrel filled beneath it. 1 closes the
  // spandrel entirely and leaves a pure curved band of constant thickness.
  flyerFolder.add(params, "topCurve", 0, 1, 0.05).name("Top Curve").onChange(rebuild);
  // The arch band's own thickness — the gap between intrados and extrados. Everything above it is spandrel.
  flyerFolder.add(params, "archThickness", 0.05, 0.8, 0.01).name("Arch Thickness").onChange(rebuild);
  // How far each end runs INTO its support. Zero leaves the end cap hanging in open air.
  flyerFolder.add(params, "flyerEmbed", 0, 0.6, 0.02).name("Flyer Embed").onChange(rebuild);
  flyerFolder.add(params, "segments", 3, 32, 1).name("Segments").onChange(rebuild);
  flyerFolder.open();

  const copingFolder = gui.addFolder("Coping");
  // TRIM along the flyer's back, not a structural member. Overhanging so water leaves at a drip.
  copingFolder.add(params, "coping").name("Coping").onChange(rebuild);
  copingFolder.add(params, "copingDepth", 0.04, 0.5, 0.01).name("Coping Depth").onChange(rebuild);
  copingFolder.add(params, "copingOverhang", 0, 0.3, 0.01).name("Coping Overhang").onChange(rebuild);
  copingFolder.open();

  const pierFolder = gui.addFolder("Pier & Wall");
  pierFolder.add(params, "span", 1, 8, 0.1).name("Span").onChange(rebuild);
  pierFolder.add(params, "pierHeight", 1, 10, 0.1).name("Pier Height").onChange(rebuild);
  pierFolder.add(params, "pierWidth", 0.2, 2, 0.05).name("Pier Width").onChange(rebuild);
  pierFolder.add(params, "wallHeight", 2, 12, 0.1).name("Wall Height").onChange(rebuild);
  pierFolder.add(params, "wallThickness", 0.1, 1.5, 0.05).name("Wall Thickness").onChange(rebuild);
  // BALLAST, not ornament. Take it to 0 and the shape barely changes, which is the point worth seeing.
  pierFolder.add(params, "pinnacleHeight", 0, 4, 0.1).name("Pinnacle Height").onChange(rebuild);
  pierFolder.add(params, "stringCourses").name("String Courses").onChange(rebuild);
  pierFolder.open();

  const color = gui.addFolder("Color");
  color.addColor(params, "color").name("Color").onChange(rebuild);
  color.add(params, "colorVariance", 0, 0.25, 0.005).name("Color Variance").onChange(rebuild);
  color.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "geometryOut").name("Geometry").listen().disable();
  readout.add(params, "thrust").name("Thrust").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    wire.dispose();
    dispose();
  };
}
