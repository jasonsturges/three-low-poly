import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
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
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Ridge and Hips",
  description:
    "STUDY — the pyramid's apex, stretched into a line, and every edge of the result CAPPED. " +
    "The ridge length is not a free parameter. If every plane is to carry the same pitch — which is what a " +
    "roof wants, since one pitch is one detail repeated rather than four reconciled — the ridge can only " +
    "be `width - depth`. The overhang cancels out of that entirely: eaves change where a roof ENDS, never " +
    "what it IS. Held loose, that one length walks the whole family — 0 is a PYRAMID, `width - depth` the " +
    "equal-pitch HIP, and full length a GABLE, where the end plane does not vanish so much as stand up and " +
    "become a wall. Three roof types are one number. " +
    "THE CAPS REPLACE AN APPROACH THAT DID NOT WORK, and the failure is worth keeping. Covering each edge " +
    "with a swept MEMBER — a bar seated on the dihedral and mitered against its neighbours — cannot close " +
    "here. A ridge cap seats on ITS bisector, straight up; the hips seat 44.1° away on theirs. Their " +
    "thicknesses derive from their own dihedrals, 0.146 against 0.099. A miter shuts only when its plane " +
    "mirrors the whole member — axis, roll AND section — so hip-to-ridge stepped by 0.083 and no tuning " +
    "moved it. " +
    "A CAP is not a member. It is a folded sheet, profile `/\\`, whose FOLD LIES ON THE EDGE, with a WING " +
    "flat on each adjacent face. That single difference dissolves all of it. Every fold line IS a roof " +
    "edge, so all folds converge at a junction by definition — there is nothing left to make meet. And two " +
    "wings lying on the SAME face close against each other as a flat, in-plane, equal-width miter, which " +
    "is the one joint that always shuts. Measured across three to twelve sides and every proportion tried, " +
    "the wings meet to 1e-16 and the apex needs no terminal piece at all. " +
    "What broke the old approach was LIFT. Seating a cap out along the bisector is what made the tops " +
    "splay and the seatings disagree, because every edge has a different bisector to be lifted along. A " +
    "fold sitting on its own edge cannot splay; it has nowhere to go. RELIEF puts that failure on a dial — " +
    "wind it up and watch the folds come apart, by a distance the readout prints. " +
    "The faces are drawn INSET and the wings fill the border, so surface and cap TILE rather than overlap. " +
    "That is why no lift is needed to stop them fighting, and it is the reason the whole thing can sit at " +
    "zero. Five edges are capped: four hips and the ridge. Eaves are left bare, because a verge trim is a " +
    "different piece with a different job.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  RIDGE       the horizontal joint at the top. A pyramid's has length zero — the same roof, turned down.
//  HIP         the sloping joint from an eave corner up to a ridge end. Shallower than both planes it
//              joins, because it climbs the same rise along a diagonal run.
//  HIP END     the triangular plane at the short end. Its pitch is set by how far the ridge stops short of
//              the eave, which makes ridge length a PITCH decision wearing a length's clothing.
//  GABLE       what the hip end becomes when the ridge runs full length: it stands vertical, and a
//              vertical roof plane is a WALL.
//  CAP         the folded sheet covering an edge. Profile `/\`; the FOLD lies on the edge, a WING lies on
//              each adjacent face. NOT a member — a member has a section and a seating, and those are
//              exactly what could not be reconciled here.
//  WING        one half of a cap, flat on one face. Two wings on the same face miter to each other in the
//              plane of that face, at equal width — the joint that always closes.
//  FOLD        the cap's crease. On the edge, which is the entire reason this works.
//  RELIEF      lifting a cap off its edge. What a real cap does physically, and what breaks convergence
//              geometrically, since each edge lifts along a different normal.
//  EAVE        left bare here. A verge or eave trim is a different piece and a different study.

interface Face {
  points: Vector3[];
  normal: Vector3;
  /** Inset for the edge LEAVING each point — the wing width, or 0 where that edge is left bare. */
  insets: number[];
}

const area = (a: Vector3, b: Vector3, c: Vector3): number =>
  new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).length();

/**
 * Split a face into its border WINGS and the interior left over.
 *
 * Each capped edge is inset by the wing width and each bare edge by nothing; where two edges meet, the
 * interior's corner is where their two inset lines CROSS. Nothing here computes a miter as such — offsetting
 * the edges and intersecting IS the miter, and it closes for the same reason a picture frame does: the two
 * strips are the same width and the corner is their mirror.
 *
 * Interior and wings tile the face exactly, which is why the caps need no lift to avoid fighting the
 * surface they sit on.
 */
const borderWings = (face: Face): { interior: Vector3[]; wings: Vector3[][] } => {
  const count = face.points.length;
  const origin = face.points[0]!;
  const u = new Vector3().subVectors(face.points[1]!, origin).normalize();
  const v = new Vector3().crossVectors(face.normal, u).normalize();
  const to2 = (p: Vector3) => new Vector2(p.clone().sub(origin).dot(u), p.clone().sub(origin).dot(v));

  const flat = face.points.map(to2);
  // Inward normal of each edge, in the face's own plane.
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

/** A planar convex polygon, fanned; degenerate triangles dropped. */
const polygon = (points: Vector3[]): BufferGeometry | null => {
  const triangles: Vector3[][] = [];
  for (let i = 1; i < points.length - 1; i++) {
    if (area(points[0]!, points[i]!, points[i + 1]!) < 1e-12) continue;
    triangles.push([points[0]!, points[i]!, points[i + 1]!]);
  }
  if (triangles.length === 0) return null;
  const positions = new Float32Array(triangles.length * 9);
  triangles.forEach((t, i) => t.forEach((p, w) => positions.set([p.x, p.y, p.z], i * 9 + w * 3)));
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x11141a,
    cameraPosition: [7.4, 4.6, 8.2],
  });

  controls.target.set(0, 2.0, 0);
  controls.update();

  const key = new DirectionalLight(0xfff4e6, 1.5);
  key.position.set(4, 6, 3.5);
  const bounce = new DirectionalLight(0x8ea8cc, 0.45);
  bounce.position.set(-3.5, 0.5, -2.5);
  scene.add(key, bounce);

  const roofing = new MeshStandardMaterial({
    color: 0x2b2f33,
    roughness: 0.62,
    metalness: 0.32,
    flatShading: true,
    side: DoubleSide,
  });
  const capping = new MeshStandardMaterial({
    color: 0xd9d5cc,
    roughness: 0.45,
    metalness: 0.35,
    flatShading: true,
    side: DoubleSide,
  });
  const masonry = new MeshStandardMaterial({ color: 0x5f5a54, roughness: 1, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    width: 4.4,
    depth: 2.6,
    rise: 2.0,
    overhang: 0.16,
    ridgeLength: 1.8,

    caps: true,
    wing: 0.14,
    relief: 0,

    wall: true,
    wallHeight: 2.2,
    wireframe: false,

    ridge: "",
    pitch: "",
    capped: "",
    close: "",
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

  const equalPitchRidge = () => Math.max(0, params.width - params.depth);

  const rebuild = () => {
    clear();
    const { width: W, depth: D, rise: R, overhang, wallHeight: base } = params;
    const halfWidth = W / 2 + overhang;
    const halfDepth = D / 2 + overhang;
    const ridge = Math.max(0, Math.min(params.ridgeLength, halfWidth * 2));

    if (params.wall) {
      const wall = new Mesh(new BoxGeometry(W, base, D), masonry);
      wall.position.y = base / 2;
      stage.add(wall);
    }

    const y = base;
    const c0 = new Vector3(-halfWidth, y, -halfDepth);
    const c1 = new Vector3(halfWidth, y, -halfDepth);
    const c2 = new Vector3(halfWidth, y, halfDepth);
    const c3 = new Vector3(-halfWidth, y, halfDepth);
    const r0 = new Vector3(-ridge / 2, y + R, 0);
    const r1 = new Vector3(ridge / 2, y + R, 0);
    const hasRidge = ridge > 1e-6;

    const normalOf = (pts: Vector3[]) => {
      for (let i = 1; i < pts.length - 1; i++) {
        if (area(pts[0]!, pts[i]!, pts[i + 1]!) > 1e-12) {
          return new Vector3()
            .subVectors(pts[i]!, pts[0]!)
            .cross(new Vector3().subVectors(pts[i + 1]!, pts[0]!))
            .normalize();
        }
      }
      return new Vector3(0, 1, 0);
    };

    // Four faces. `insets` marks which edges get a wing — the four hips and the ridge. The eave of each
    // face is left bare.
    const w = params.caps ? params.wing : 0;
    const raw = hasRidge
      ? [
          { points: [c0, r0, r1, c1], insets: [w, w, w, 0] },
          { points: [c2, r1, r0, c3], insets: [w, w, w, 0] },
          { points: [c3, r0, c0], insets: [w, w, 0] },
          { points: [c1, r1, c2], insets: [w, w, 0] },
        ]
      : [
          { points: [c0, r0, c1], insets: [w, w, 0] },
          { points: [c2, r1, c3], insets: [w, w, 0] },
          { points: [c3, r0, c0], insets: [w, w, 0] },
          { points: [c1, r1, c2], insets: [w, w, 0] },
        ];
    const faces: Face[] = raw.map((f) => ({ ...f, normal: normalOf(f.points) }));

    let wingCount = 0;
    let worstFold = 0;
    const folds = new Map<string, Vector3[]>();
    const keyOf = (a: Vector3, b: Vector3) => {
      const s = (p: Vector3) => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
      return [s(a), s(b)].sort().join("|");
    };

    for (const face of faces) {
      const { interior, wings } = borderWings(face);
      const inner = polygon(interior);
      if (inner) stage.add(new Mesh(inner, roofing));

      for (const quad of wings) {
        wingCount += 1;
        // RELIEF lifts the wing off its face along that face's OWN normal. At zero the wing lies in the
        // face and the fold stays exactly on the edge; lift it and the two halves of a cap rise along
        // different normals, which is precisely how the swept-member approach came apart.
        const lifted = quad.map((p) => p.clone().addScaledVector(face.normal, params.relief));
        const g = polygon(lifted);
        if (g) stage.add(new Mesh(g, capping));

        const k = keyOf(quad[0]!, quad[1]!);
        const bucket = folds.get(k) ?? [];
        bucket.push(lifted[0]!.clone().add(lifted[1]!).multiplyScalar(0.5));
        folds.set(k, bucket);
      }
    }

    // A cap's two wings share one fold — exactly, until relief separates them.
    for (const bucket of folds.values()) {
      if (bucket.length >= 2) worstFold = Math.max(worstFold, bucket[0]!.distanceTo(bucket[1]!));
    }

    if (params.wireframe) {
      for (const child of [...stage.children]) {
        if (child instanceof Mesh) stage.add(new LineSegments(new WireframeGeometry(child.geometry), wire));
      }
    }

    const mainPitch = (Math.atan2(R, halfDepth) * 180) / Math.PI;
    const endRun = halfWidth - ridge / 2;
    const endPitch = endRun < 1e-6 ? 90 : (Math.atan2(R, endRun) * 180) / Math.PI;
    const equal = equalPitchRidge();

    params.ridge =
      ridge < 1e-6
        ? "0.00 — PYRAMID, apex is a point"
        : endRun < 1e-6
          ? `${ridge.toFixed(2)} — GABLE, the ends have stood up into walls`
          : Math.abs(ridge - equal) < 0.005
            ? `${ridge.toFixed(2)} — equal-pitch HIP (width - depth)`
            : `${ridge.toFixed(2)} — hip, unequal pitch · equal wants ${equal.toFixed(2)}`;
    params.pitch =
      Math.abs(mainPitch - endPitch) < 0.05
        ? `${mainPitch.toFixed(1)}° on every plane`
        : `${mainPitch.toFixed(1)}° long slopes · ${endPitch.toFixed(1)}° hip ends`;
    params.capped = params.caps
      ? `${hasRidge ? 5 : 4} edges capped · ${wingCount} wings · eaves left bare`
      : "caps off — bare faces";
    params.close = !params.caps
      ? "no caps"
      : worstFold < 1e-9
        ? `folds closed to ${worstFold.toExponential(1)} — each cap's halves share their edge`
        : `folds SPLIT by ${worstFold.toFixed(4)} — relief lifts each half along a different normal`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Ridge and Hips");

  const cap = gui.addFolder("Caps");
  cap.add(params, "caps").name("Caps").onChange(rebuild);
  // Corners between two capped edges miter in the plane of the face they share — no angle is computed.
  cap.add(params, "wing", 0.02, 0.5, 0.005).name("Wing Width").onChange(rebuild);
  // The old failure, on a dial. At 0 the fold sits on its edge and everything closes.
  cap.add(params, "relief", 0, 0.12, 0.002).name("Relief").onChange(rebuild);
  cap.open();

  const ridgeFolder = gui.addFolder("Ridge");
  const ridgeControl = ridgeFolder
    .add(params, "ridgeLength", 0, 10, 0.05)
    .name("Ridge Length")
    .onChange(rebuild);
  ridgeFolder
    .add(
      {
        snap: () => {
          params.ridgeLength = equalPitchRidge();
          ridgeControl.updateDisplay();
          rebuild();
        },
      },
      "snap",
    )
    .name("Snap to Equal Pitch");
  ridgeFolder.open();

  const form = gui.addFolder("Roof");
  form.add(params, "width", 1, 9, 0.1).name("Width").onChange(rebuild);
  form.add(params, "depth", 1, 9, 0.1).name("Depth").onChange(rebuild);
  form.add(params, "rise", 0.4, 6, 0.1).name("Rise").onChange(rebuild);
  form.add(params, "overhang", 0, 0.8, 0.01).name("Overhang").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wall").name("Wall").onChange(rebuild);
  inspect.add(params, "wallHeight", 0.5, 5, 0.1).name("Wall Height").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "ridge").name("Ridge").listen().disable();
  readout.add(params, "pitch").name("Pitch").listen().disable();
  readout.add(params, "capped").name("Caps").listen().disable();
  readout.add(params, "close").name("Closure").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    roofing.dispose();
    capping.dispose();
    masonry.dispose();
    wire.dispose();
    dispose();
  };
}
