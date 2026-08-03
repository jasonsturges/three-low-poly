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
  WireframeGeometry,
} from "three";
import { layPlankFloor, mulberry32 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Polygonal Shakes",
  description:
    "STUDY — the whole thing together: an n-gon roof, every face covered in cedar shakes, every hip capped. " +
    "Three pieces that were each proved separately, and the point is that none of them needed changing. " +
    "The CAPS are folded sheets whose fold lies on the edge, with a wing flat on each adjacent face. Every " +
    "fold line is a roof edge, so all folds converge at the apex by definition, and two wings on the same " +
    "face close as a flat in-plane miter. No terminal piece, at any side count. " +
    "The SHAKES are `layPlankFloor` unchanged — a course is a row, shake width is board length, exposure is " +
    "board width — and each shake costs FOUR triangles because only its exposed part is built. " +
    "What joins them is the answer to a question that looked hard: how do the shakes meet at a hip? They " +
    "are CLIPPED to the face's inset interior, and the cap's wing covers the cut. That is not a shortcut, " +
    "it is what the trade does — the Certi-label sheet says to cut the shakes back on a bevel at the hip, " +
    "precisely because the cut edge disappears under the cap and never has to be neat. So the clip is " +
    "hidden by construction, and a rough one costs nothing. " +
    "The clipping is Sutherland–Hodgman against a convex interior, the same operation the hardwood floor " +
    "uses, with the same sliver rule: a shake reduced below a minimum area is dropped rather than laid, " +
    "because a two-millimeter wedge of cedar is debris and not a shake. The readout counts how many were " +
    "laid whole, how many were cut, and how many were thrown away — on a triangular face that last number " +
    "is large, and it is the real cost of covering a shape that is not a rectangle. " +
    "Watch Sides. The faces get narrower and more numerous, so the same roof takes more courses of shorter " +
    "runs and the clipped fraction climbs — a twelve-sided roof spends far more of its shakes on offcuts " +
    "than a square one does. That is a genuine property of the form, not of the algorithm.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  CAP / WING  the folded sheet on each hip, and its two halves. Fold on the edge; see `ridge-and-hips`.
//  INTERIOR    the face inset by the wing width. Shakes are laid inside it and clipped to it, so the cut
//              edge lands under the cap.
//  BEVEL BACK  the trade's name for that cut. Deliberately rough — it is covered.
//  SLIVER      an offcut too small to be a shake. Dropped, not laid.
//  EXPOSURE    how much of each shake shows. Shake length minus headlap, and an OUTPUT.
//  STAGGER     the offset between end joints in neighboring courses. On a roof, aligned joints are where
//              water goes.
//  COURSE      one row of shakes, laid across the face and stacked up the slope from the eave.

interface Face {
  points: Vector3[];
  normal: Vector3;
  insets: number[];
}

/** The roof's own axis — the one direction every hip shares, and the only one their folds can meet on. */
const AXIS = new Vector3(0, 1, 0);

const area3 = (a: Vector3, b: Vector3, c: Vector3): number =>
  new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).length();

/** The face's border wings and the interior left over. See `ridge-and-hips` for why this IS the miter. */
const borderWings = (face: Face): { interior: Vector3[]; wings: Vector3[][] } => {
  const count = face.points.length;
  const origin = face.points[0]!;
  const u = new Vector3().subVectors(face.points[1]!, origin).normalize();
  const v = new Vector3().crossVectors(face.normal, u).normalize();
  const flat = face.points.map((p) => new Vector2(p.clone().sub(origin).dot(u), p.clone().sub(origin).dot(v)));
  const inward = flat.map((p, i) => {
    const q = flat[(i + 1) % count]!;
    const d = new Vector2(q.x - p.x, q.y - p.y).normalize();
    return new Vector2(-d.y, d.x);
  });
  const signed =
    flat.reduce((sum, p, i) => {
      const q = flat[(i + 1) % count]!;
      return sum + (p.x * q.y - q.x * p.y);
    }, 0) / 2;
  const sign = signed < 0 ? -1 : 1;

  const interior = flat.map((p, i) => {
    const prev = (i + count - 1) % count;
    const a = flat[prev]!;
    const na = inward[prev]!.clone().multiplyScalar(sign);
    const nb = inward[i]!.clone().multiplyScalar(sign);
    const ca = na.x * a.x + na.y * a.y + face.insets[prev]!;
    const cb = nb.x * p.x + nb.y * p.y + face.insets[i]!;
    const det = na.x * nb.y - nb.x * na.y;
    const q =
      Math.abs(det) < 1e-9
        ? new Vector2(p.x + na.x * face.insets[i]!, p.y + na.y * face.insets[i]!)
        : new Vector2((ca * nb.y - cb * na.y) / det, (na.x * cb - nb.x * ca) / det);
    return origin.clone().addScaledVector(u, q.x).addScaledVector(v, q.y);
  });

  const wings: Vector3[][] = [];
  for (let i = 0; i < count; i++) {
    if (!face.insets[i]) continue;
    const j = (i + 1) % count;
    wings.push([face.points[i]!, face.points[j]!, interior[j]!, interior[i]!]);
  }
  return { interior, wings };
};

/**
 * Clip a convex polygon to a convex region — Sutherland–Hodgman, the same operation the hardwood floor
 * uses to trim boards at a wall.
 *
 * Returns an empty array when nothing survives, which is the common case near a hip: a triangular face
 * throws away a great many shakes, and that is a property of covering a shape that is not a rectangle.
 */
const clipToConvex = (subject: Vector2[], region: Vector2[]): Vector2[] => {
  // The inside test depends on which way the region is wound, and a face's own 2-D frame gives no
  // guarantee either way — get it backwards and EVERY shake is clipped away, silently. So the winding is
  // measured rather than assumed.
  const signed =
    region.reduce((sum, p, i) => {
      const q = region[(i + 1) % region.length]!;
      return sum + (p.x * q.y - q.x * p.y);
    }, 0) / 2;
  const turn = signed < 0 ? -1 : 1;

  let output = subject;
  for (let i = 0; i < region.length && output.length > 0; i++) {
    const a = region[i]!;
    const b = region[(i + 1) % region.length]!;
    const edge = new Vector2(b.x - a.x, b.y - a.y);
    const inside = (p: Vector2) => turn * (edge.x * (p.y - a.y) - edge.y * (p.x - a.x)) >= -1e-12;
    const input = output;
    output = [];
    for (let k = 0; k < input.length; k++) {
      const cur = input[k]!;
      const prev = input[(k + input.length - 1) % input.length]!;
      const curIn = inside(cur);
      const prevIn = inside(prev);
      if (curIn !== prevIn) {
        const d = new Vector2(cur.x - prev.x, cur.y - prev.y);
        const denom = edge.x * d.y - edge.y * d.x;
        if (Math.abs(denom) > 1e-12) {
          const t = (edge.x * (prev.y - a.y) - edge.y * (prev.x - a.x)) / -denom;
          output.push(new Vector2(prev.x + d.x * t, prev.y + d.y * t));
        }
      }
      if (curIn) output.push(cur);
    }
  }
  return output;
};

const area2 = (ring: Vector2[]): number =>
  Math.abs(
    ring.reduce((sum, p, i) => {
      const q = ring[(i + 1) % ring.length]!;
      return sum + (p.x * q.y - q.x * p.y);
    }, 0) / 2,
  );

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x14171d,
    cameraPosition: [5.2, 3.6, 6.0],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.55);
  key.position.set(3.5, 5, 4);
  const bounce = new DirectionalLight(0x8ea8cc, 0.4);
  bounce.position.set(-3, -0.5, -2.5);
  scene.add(key, bounce);

  const cedar = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    flatShading: true,
    side: DoubleSide,
  });
  const capping = new MeshStandardMaterial({ color: 0xb9ad96, roughness: 0.7, flatShading: true, side: DoubleSide });
  const sheathing = new MeshStandardMaterial({ color: 0x2b2724, roughness: 1, flatShading: true, side: DoubleSide });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    sides: 6,
    radius: 1.9,
    rise: 1.9,

    wing: 0.13,
    exposure: 0.14,
    minWidth: 0.09,
    maxWidth: 0.22,
    thickness: 0.016,
    minStagger: 0.09,
    minSliver: 0.15,
    capLap: 1.2,
    jitter: 0.35,

    color: "#8a6f52",
    colorVariance: 0.09,
    seed: 0x51ab,

    caps: true,
    wireframe: false,

    laid: "",
    waste: "",
    cost: "",
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
    const n = Math.max(3, Math.round(params.sides));
    const apex = new Vector3(0, params.rise, 0);
    const corner = (i: number) => {
      const a = ((i % n) / n) * Math.PI * 2;
      return new Vector3(Math.cos(a) * params.radius, 0, Math.sin(a) * params.radius);
    };

    const w = params.caps ? params.wing : 0;
    const faces: Face[] = Array.from({ length: n }, (_, i) => {
      const points = [corner(i), apex.clone(), corner(i + 1)];
      const normal = new Vector3()
        .subVectors(points[1]!, points[0]!)
        .cross(new Vector3().subVectors(points[2]!, points[0]!))
        .normalize();
      // Edges leaving each point: hip up, hip down, then the eave — the eave is left bare.
      return { points, normal, insets: [w, w, 0] };
    });

    const random = mulberry32(params.seed ^ 0x1d3f);
    const base = new Color(params.color);
    const tint = new Color();
    const triangles: Vector3[][] = [];
    const colors: Color[] = [];

    let whole = 0;
    let cut = 0;
    let dropped = 0;
    let exposed = 0;
    let wings = 0;

    faces.forEach((face, fi) => {
      const { interior, wings: border } = borderWings(face);

      // Sheathing behind, so a dropped sliver reads as a gap rather than as nothing.
      const backing: Vector3[][] = [];
      for (let i = 1; i < face.points.length - 1; i++)
        backing.push([face.points[0]!, face.points[i]!, face.points[i + 1]!]);
      {
        const positions = new Float32Array(backing.length * 9);
        backing.forEach((t, i) => t.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)));
        const g = new BufferGeometry();
        g.setAttribute("position", new BufferAttribute(positions, 3));
        g.computeVertexNormals();
        stage.add(new Mesh(g, sheathing));
      }

      border.forEach((quad, edgeIndex) => {
        wings += 1;
        // Lifted clear of the shake course beneath, so the cap LAPS OVER their cut ends rather than
        // butting into them. A cap level with the field would show every bevel it exists to hide.
        //
        // BUT THE FOLD CANNOT BE LIFTED ALONG ONE FACE'S NORMAL. Do that and each half of the cap rises in
        // a different direction and the crease splits open — a dark line straight down every hip. A lifted
        // cap's fold is where the two OFFSET PLANES meet, which is up the BISECTOR by `lap / cos(alpha)`:
        // that single point lies in both, since the bisector makes the same angle with either normal.
        const lap = params.thickness * (1 + params.capLap);
        const neighbor = faces[edgeIndex === 0 ? (fi + n - 1) % n : (fi + 1) % n]!;
        const bisector = face.normal.clone().add(neighbor.normal).normalize();
        const cosAlpha = Math.max(1e-6, bisector.dot(face.normal));

        // AT THE APEX THE LIFT FOLLOWS THE ROOF'S AXIS, NOT THE HIP'S BISECTOR. Every hip has a different
        // bisector, so lifting along them sends the folds off in different directions and they open into a
        // ring above the peak. Tapering the lift to zero closes that ring but buries the cap under the
        // shakes, which is worse. The axis is the one direction ALL the hips share, so a fold lifted along
        // it lands on a single point — and the lift stays full, so nothing is buried.
        //
        // Both raises are sized to clear their own face by `lap`: divide by the cosine between the lift
        // direction and the face normal, which is `cos(alpha)` for the bisector and `axis . n` for the axis.
        const cosAxis = Math.max(1e-6, AXIS.dot(face.normal));
        const raise = (p: Vector3) =>
          p.distanceTo(apex) < 1e-9
            ? p.clone().addScaledVector(AXIS, lap / cosAxis)
            : p.clone().addScaledVector(bisector, lap / cosAlpha);
        const over = [
          raise(quad[0]!),
          raise(quad[1]!),
          quad[2]!.clone().addScaledVector(face.normal, lap),
          quad[3]!.clone().addScaledVector(face.normal, lap),
        ];
        const tris = [
          [over[0]!, over[1]!, over[2]!],
          [over[0]!, over[2]!, over[3]!],
        ];
        const positions = new Float32Array(tris.length * 9);
        tris.forEach((t, i) => t.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)));
        const g = new BufferGeometry();
        g.setAttribute("position", new BufferAttribute(positions, 3));
        g.computeVertexNormals();
        stage.add(new Mesh(g, capping));
      });

      // The face's own 2-D frame: `u` along the eave, `v` up the slope. Courses stack in `v`.
      const eave = face.points[2]!.clone().sub(face.points[0]!);
      const u = eave.clone().normalize();
      const v = new Vector3().crossVectors(face.normal, u).normalize();
      const origin = face.points[0]!;
      const to2 = (p: Vector3) => new Vector2(p.clone().sub(origin).dot(u), p.clone().sub(origin).dot(v));
      const to3 = (p: Vector2, lift: number) =>
        origin
          .clone()
          .addScaledVector(u, p.x)
          .addScaledVector(v, p.y)
          .addScaledVector(face.normal, lift);

      // THE SHAKES RUN UNDER THE CAPS. Clipping them to the INSET interior instead leaves a hole wherever
      // one is dropped as a sliver — the cap only covers OUTSIDE that boundary, so a shake stopped short of
      // it is stopped short of nothing. Clipped to the FULL face they run up to the hip and the cap laps
      // over their cut ends, which is what the trade does: bevel them back, then cover the cut.
      const region = face.points.map(to2);
      const xs = region.map((p) => p.x);
      const ys = region.map((p) => p.y);
      const x0 = Math.min(...xs);
      const y0 = Math.min(...ys);
      const spanX = Math.max(...xs) - x0;
      const spanY = Math.max(...ys) - y0;
      if (spanX <= 0 || spanY <= 0) return;

      // The SETTING-OUT IS NOT NEW: the wood floors' packer, with a course as a row.
      const layout = layPlankFloor({
        length: spanX,
        depth: spanY,
        plankWidth: params.exposure,
        gap: 0,
        minPlankLength: params.minWidth,
        maxPlankLength: params.maxWidth,
        minStagger: params.minStagger,
        seed: params.seed,
      });
      const fullArea = params.exposure * ((params.minWidth + params.maxWidth) / 2);

      for (const shake of layout.placements) {
        const a0 = x0 + shake.start;
        const a1 = a0 + shake.length;
        const butt = y0 + shake.row * layout.plankWidth;
        const head = butt + layout.plankWidth;
        const quad = [
          new Vector2(a0, butt),
          new Vector2(a1, butt),
          new Vector2(a1, head),
          new Vector2(a0, head),
        ];
        const clipped = clipToConvex(quad, region);
        if (clipped.length < 3) {
          dropped += 1;
          continue;
        }
        const kept = area2(clipped);
        // A shake cut below the sliver threshold is debris, not a shake. Dropping one only leaves a
        // visible hole if it sat OUTSIDE the cap's reach, so that is what gets counted.
        if (kept < fullArea * params.minSliver) {
          dropped += 1;
          let nearestEdge = Infinity;
          for (const p of clipped) {
            for (let e = 0; e < region.length; e++) {
              const a = region[e]!;
              const b = region[(e + 1) % region.length]!;
              const ex = b.x - a.x;
              const ey = b.y - a.y;
              const len = Math.hypot(ex, ey);
              if (len < 1e-9) continue;
              nearestEdge = Math.min(nearestEdge, Math.abs(ex * (p.y - a.y) - ey * (p.x - a.x)) / len);
            }
          }
          if (nearestEdge > params.wing) exposed += 1;
          continue;
        }
        if (kept < area2(quad) - 1e-9) cut += 1;
        else whole += 1;

        const lift = params.thickness * (1 + params.jitter * (random() - 0.5) * 2);
        const top = clipped.map((p) => to3(p, lift));
        for (let i = 1; i < top.length - 1; i++) triangles.push([top[0]!, top[i]!, top[i + 1]!]);

        // THE BUTT — only along whatever of the shake's lower edge survived the clip.
        for (let i = 0; i < clipped.length; i++) {
          const p = clipped[i]!;
          const q = clipped[(i + 1) % clipped.length]!;
          if (Math.abs(p.y - butt) > 1e-9 || Math.abs(q.y - butt) > 1e-9) continue;
          const pt = to3(p, lift);
          const qt = to3(q, lift);
          const pb = to3(p, 0);
          const qb = to3(q, 0);
          triangles.push([pb, qb, qt], [pb, qt, pt]);
        }

        tint
          .copy(base)
          .offsetHSL(
            (random() - 0.5) * params.colorVariance * 0.35,
            (random() - 0.5) * params.colorVariance,
            (random() - 0.5) * params.colorVariance,
          );
        while (colors.length < triangles.length) colors.push(tint.clone());
      }
    });

    if (triangles.length > 0) {
      const positions = new Float32Array(triangles.length * 9);
      const colorAttr = new Float32Array(triangles.length * 9);
      triangles.forEach((t, i) => {
        t.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3));
        const c = colors[i] ?? tint;
        for (let v = 0; v < 3; v++) colorAttr.set([c.r, c.g, c.b], i * 9 + v * 3);
      });
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(positions, 3));
      geometry.setAttribute("color", new BufferAttribute(colorAttr, 3));
      geometry.computeVertexNormals();
      stage.add(new Mesh(geometry, cedar));
      if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));
    }

    const total = whole + cut + dropped;
    params.laid = `${whole + cut} shakes on ${n} faces · ${whole} whole, ${cut} cut back at a hip`;
    params.waste =
      `${dropped} dropped as slivers — ${total ? ((100 * dropped) / total).toFixed(0) : "0"}% of what the packer proposed · ` +
      (exposed === 0 ? "all of them under a cap" : `${exposed} would leave a HOLE — raise Min Sliver or Wing Width`);
    params.cost = `${triangles.length} triangles in 1 draw call · ${wings} cap wings, ${n} hips`;
  };
  rebuild();
  // FRAME ONCE, NEVER ON REBUILD. Re-framing on a dial change fights the viewer: `retarget` snaps the orbit
  // point back to the model's center, which throws away a pan (shift-drag is what moves the target).
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Polygonal Shakes");

  const roof = gui.addFolder("Roof");
  // Watch the clipped fraction climb: narrower faces spend more of their shakes on offcuts.
  roof.add(params, "sides", 3, 12, 1).name("Sides").onChange(rebuild);
  roof.add(params, "radius", 0.8, 4, 0.05).name("Radius").onChange(rebuild);
  roof.add(params, "rise", 0.4, 5, 0.05).name("Rise").onChange(rebuild);
  roof.open();

  const cap = gui.addFolder("Caps");
  // The wing covers the clip line, which is why the shakes may be cut roughly at the hip.
  cap.add(params, "caps").name("Caps").onChange(rebuild);
  cap.add(params, "wing", 0.03, 0.4, 0.005).name("Wing Width").onChange(rebuild);
  // How far the cap rides above the field, in butt thicknesses. It has to clear the course beneath, or
  // the beveled ends it exists to hide show through it.
  cap.add(params, "capLap", 0.2, 4, 0.1).name("Cap Lap").onChange(rebuild);
  cap.open();

  const shake = gui.addFolder("Shakes");
  shake.add(params, "exposure", 0.05, 0.35, 0.005).name("Exposure").onChange(rebuild);
  shake.add(params, "minWidth", 0.04, 0.3, 0.005).name("Min Width").onChange(rebuild);
  shake.add(params, "maxWidth", 0.06, 0.4, 0.005).name("Max Width").onChange(rebuild);
  shake.add(params, "thickness", 0.004, 0.05, 0.002).name("Butt Thickness").onChange(rebuild);
  // Below this fraction of a whole shake, an offcut is debris and is not laid.
  shake.add(params, "minSliver", 0, 0.6, 0.01).name("Min Sliver").onChange(rebuild);
  shake.add(params, "minStagger", 0, 0.3, 0.005).name("Min Stagger").onChange(rebuild);
  shake.add(params, "jitter", 0, 1, 0.05).name("Hand-split Jitter").onChange(rebuild);
  shake.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);
  shake.open();

  const color = gui.addFolder("Color");
  color.addColor(params, "color").name("Color").onChange(rebuild);
  color.add(params, "colorVariance", 0, 0.3, 0.005).name("Color Variance").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "waste").name("Waste").listen().disable();
  readout.add(params, "cost").name("Cost").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    cedar.dispose();
    capping.dispose();
    sheathing.dispose();
    wire.dispose();
    dispose();
  };
}
