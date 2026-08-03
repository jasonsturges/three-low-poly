import GUI from "lil-gui";
import {
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  ShapeUtils,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Dormer",
  description:
    "STUDY — a dormer standing out of a roof, and the HOLE it needs underneath. Two separate questions " +
    "live here and it is worth keeping them apart: where the dormer's surfaces DIE into the roof, and " +
    "whether the roof is actually opened where they do. " +
    "The first is pure intersection and it comes out simpler than the photograph suggests. Every horizontal " +
    "line on the dormer dies into the roof at a predictable place, because a roof descending at pitch `p` " +
    "puts height `y` at `z = -y / tan p` and nothing else is involved. The eave line dies there, the ridge " +
    "line dies further up-slope because it is higher, and each CHEEK is therefore a plain triangle: a " +
    "vertical front edge, a horizontal top, and a bottom that simply follows the roof. Each of the " +
    "dormer's two roof faces is ONE PLANAR TRAPEZOID — measured planar to zero — bounded by the ridge, the " +
    "eave, the front, and the roof it dies into. That last edge IS the VALLEY, so the valley needs no " +
    "construction at all: it is a boundary of the face rather than something computed and then fitted. " +
    "The second question is the one that decides how the model behaves. ADDITIVE leaves the roof whole and " +
    "lets the dormer's buried parts sit inside it — invisible from outside, cheap, and what a low-poly " +
    "asset usually wants. HOLE CUT removes the dormer's FOOTPRINT from the roof, which is a pentagon in " +
    "plan: the front edge, the two cheeks, and the two valleys. Then the opening is real and the dormer " +
    "reads from inside as well as out. " +
    "The thing worth noticing is that no trimming is needed either way. The dormer's own surfaces already " +
    "terminate exactly on that pentagon — the cheeks end where they meet the roof, the roof faces end at " +
    "their valleys — so the hole's boundary and the dormer's edges are the SAME lines, arrived at " +
    "independently. Turn on Seam to draw them. Where two constructions agree without being made to, there " +
    "is usually one fact underneath: here it is that both are just the roof plane, met by different parts " +
    "of the same box. " +
    "Buildability has a real limit, and it is not the width. Raise Rise or move the dormer up-slope and the " +
    "ridge dies further and further back; push it past the roof's own ridge and the dormer has broken " +
    "through the top of the building. The readout says where it lands and whether it still fits.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  DORMER      a framed projection standing out of a sloping roof, with its own roof and a vertical face.
//              GABLED here — the commonest — but the same construction takes a shed or hipped head.
//  CHEEK       the dormer's side wall. Vertical, and a TRIANGLE: vertical at the front, horizontal along
//              the eave, and its bottom simply follows the roof it stands on.
//  VALLEY      where the dormer's roof dies into the main roof. Reentrant, and the one place a roof turns
//              concave. Here it needs no construction: it is the back edge of a face that was planar
//              anyway.
//  FOOTPRINT   the region of main roof the dormer covers — a pentagon in plan: front edge, two cheeks,
//              two valleys. This is exactly the hole, when there is one.
//  SEAM        the footprint's boundary. In construction it is flashed, and it is where every leak starts.
//  DIES INTO   where a line on the dormer meets the roof. For a horizontal line at height `y` on a roof
//              of pitch `p`, that is `z = -y / tan p`. Every death point here is that one formula.
//  ADDITIVE    the roof left whole, the dormer's buried parts hidden inside it.
//  HEAD        the top of the dormer's window opening. Not modelled — this study is the shell.

type Build = "additive" | "hole";

/** Triangulate a planar polygon (with optional holes) given in plan, then lift it onto the roof. */
const roofSurface = (contour: Vector2[], holes: Vector2[][], heightAt: (z: number) => number): BufferGeometry => {
  const area = (ring: Vector2[]) =>
    ring.reduce((sum, p, i) => {
      const q = ring[(i + 1) % ring.length]!;
      return sum + (p.x * q.y - q.x * p.y);
    }, 0) / 2;
  // three.js wants the contour counter-clockwise and holes the other way round.
  const outer = area(contour) < 0 ? [...contour].reverse() : contour;
  const inner = holes.map((h) => (area(h) > 0 ? [...h].reverse() : h));

  const faces = ShapeUtils.triangulateShape(outer, inner);
  const points = [...outer, ...inner.flat()];
  const positions = new Float32Array(faces.length * 9);
  faces.forEach((face, i) =>
    face.forEach((index, v) => {
      const p = points[index]!;
      positions.set([p.x, heightAt(p.y), p.y], i * 9 + v * 3);
    }),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
};

/** A planar polygon in 3D, fanned. Every polygon here is convex, so a fan is safe. */
const face = (points: Vector3[]): BufferGeometry => {
  const triangles: Vector3[][] = [];
  for (let i = 1; i < points.length - 1; i++) triangles.push([points[0]!, points[i]!, points[i + 1]!]);
  const positions = new Float32Array(triangles.length * 9);
  triangles.forEach((triangle, i) =>
    triangle.forEach((p, v) => positions.set([p.x, p.y, p.z], i * 9 + v * 3)),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x11141a,
    cameraPosition: [4.2, 3.2, 5.0],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.5);
  key.position.set(3, 4.5, 4);
  const bounce = new DirectionalLight(0x8ea8cc, 0.45);
  bounce.position.set(-3, -0.5, -2);
  scene.add(key, bounce);

  const shingle = new MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.85, flatShading: true, side: DoubleSide });
  const clapboard = new MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.8, flatShading: true, side: DoubleSide });
  const dormerRoof = new MeshStandardMaterial({ color: 0x4a5057, roughness: 0.8, flatShading: true, side: DoubleSide });
  const seamLine = new LineBasicMaterial({ color: 0xffd166 });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    build: "hole" as Build,
    pitch: 38,
    roofWidth: 5,
    roofRun: 3.2,
    width: 1.3,
    front: 2.1,
    wallHeight: 0.62,
    rise: 0.5,
    seam: true,
    wireframe: false,

    dies: "",
    valley: "",
    fit: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments || child instanceof Line) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();
    const p = (params.pitch * Math.PI) / 180;
    const tan = Math.tan(p);
    // The main roof descends toward +Z: its ridge is at z = 0 and its eave at z = roofRun.
    const heightAt = (z: number) => -z * tan;

    const half = params.width / 2;
    const front = params.front;
    // THE ONE FORMULA. A horizontal line at height `y` meets the roof at `z = -y / tan p`, and every death
    // point on the dormer is an instance of it.
    const diesAt = (y: number) => -y / tan;

    const eaveY = heightAt(front) + params.wallHeight;
    const ridgeY = eaveY + params.rise;
    const cheekZ = diesAt(eaveY);
    const ridgeZ = diesAt(ridgeY);

    // THE FOOTPRINT, in plan (x, z): front edge, two cheeks, two valleys. This IS the hole.
    const footprint: Vector2[] = [
      new Vector2(-half, front),
      new Vector2(half, front),
      new Vector2(half, cheekZ),
      new Vector2(0, ridgeZ),
      new Vector2(-half, cheekZ),
    ];

    const halfRoof = params.roofWidth / 2;
    const outline: Vector2[] = [
      new Vector2(-halfRoof, 0),
      new Vector2(halfRoof, 0),
      new Vector2(halfRoof, params.roofRun),
      new Vector2(-halfRoof, params.roofRun),
    ];
    // The footprint only makes a legal hole while it lies inside the roof and does not fold over itself.
    const contained =
      ridgeZ > 0 && front < params.roofRun && half < halfRoof && ridgeZ < cheekZ && cheekZ < front;
    const cut = params.build === "hole" && contained;
    stage.add(new Mesh(roofSurface(outline, cut ? [footprint] : [], heightAt), shingle));

    // --- the dormer ------------------------------------------------------
    // Each CHEEK is a triangle: vertical at the front, horizontal along the eave, bottom on the roof.
    for (const side of [-1, 1] as const) {
      stage.add(
        new Mesh(
          face([
            new Vector3(side * half, heightAt(front), front),
            new Vector3(side * half, eaveY, front),
            new Vector3(side * half, eaveY, cheekZ),
          ]),
          clapboard,
        ),
      );
    }
    // The FACE: a gable pentagon, vertical at the front.
    stage.add(
      new Mesh(
        face([
          new Vector3(-half, heightAt(front), front),
          new Vector3(half, heightAt(front), front),
          new Vector3(half, eaveY, front),
          new Vector3(0, ridgeY, front),
          new Vector3(-half, eaveY, front),
        ]),
        clapboard,
      ),
    );
    // Each dormer ROOF face is ONE planar trapezoid — ridge, front, eave, and the VALLEY as its back edge.
    for (const side of [-1, 1] as const) {
      stage.add(
        new Mesh(
          face([
            new Vector3(0, ridgeY, front),
            new Vector3(side * half, eaveY, front),
            new Vector3(side * half, eaveY, cheekZ),
            new Vector3(0, ridgeY, ridgeZ),
          ]),
          dormerRoof,
        ),
      );
    }

    // THE SEAM — the footprint's boundary, which is also where every dormer surface ends. Drawn from the
    // footprint alone: that it lands on the dormer's own edges is the point, not a coincidence to arrange.
    if (params.seam) {
      const loop = [...footprint, footprint[0]!].map((q) => new Vector3(q.x, heightAt(q.y) + 0.004, q.y));
      stage.add(new Line(new BufferGeometry().setFromPoints(loop), seamLine));
    }
    if (params.wireframe) {
      for (const child of [...stage.children]) {
        if (child instanceof Mesh) stage.add(new LineSegments(new WireframeGeometry(child.geometry), wire));
      }
    }

    // --- readouts --------------------------------------------------------
    const valleyRun = Math.hypot(half, cheekZ - ridgeZ);
    const valleyFall = ridgeY - eaveY;
    const valleyPitch = (Math.atan2(valleyFall, valleyRun) * 180) / Math.PI;

    params.dies = `eave at z ${cheekZ.toFixed(3)} · ridge at z ${ridgeZ.toFixed(3)} — both from z = -y / tan p`;
    params.valley = `${valleyPitch.toFixed(1)}° fall · ${Math.hypot(valleyRun, valleyFall).toFixed(3)} long — the back edge of a planar face`;
    params.fit = !contained
      ? ridgeZ <= 0
        ? `ridge dies at z ${ridgeZ.toFixed(2)} — PAST the roof's own ridge, the dormer has broken through`
        : `footprint does not fit the roof — hole suppressed, showing additive`
      : params.build === "hole"
        ? `hole cut · footprint spans z ${ridgeZ.toFixed(2)} to ${front.toFixed(2)}`
        : `additive · the roof is whole and the buried parts sit inside it`;

    frameObject(handle, stage, { dolly: false });
  };
  rebuild();
  // Framed once here, then re-centred without dollying after every rebuild: these studies have dials that
  // move the model (rise, ridge length, sides), and re-fitting each time would snap the viewer's zoom back.
  frameObject(handle, stage, { fit: 1.45 });

  const gui = new GUI();
  gui.title("Dormer");

  const build = gui.addFolder("Build");
  // The question that decides how the model behaves. Additive is what a low-poly asset usually wants.
  build.add(params, "build", { "Hole cut": "hole", Additive: "additive" }).name("Roof").onChange(rebuild);
  // The footprint's boundary is also where every dormer surface ends — drawn from the footprint alone.
  build.add(params, "seam").name("Seam").onChange(rebuild);
  build.open();

  const shape = gui.addFolder("Dormer");
  shape.add(params, "width", 0.4, 3, 0.05).name("Width").onChange(rebuild);
  // Down-slope position of the face. Further down means a bigger dormer for the same wall height.
  shape.add(params, "front", 0.6, 3.2, 0.05).name("Position").onChange(rebuild);
  shape.add(params, "wallHeight", 0.15, 1.6, 0.05).name("Wall Height").onChange(rebuild);
  // Raise this and the ridge dies further up-slope — past the roof's own ridge it breaks through.
  shape.add(params, "rise", 0.05, 1.5, 0.05).name("Rise").onChange(rebuild);
  shape.open();

  const roof = gui.addFolder("Roof");
  roof.add(params, "pitch", 15, 65, 1).name("Pitch").onChange(rebuild);
  roof.add(params, "roofWidth", 2, 9, 0.1).name("Width").onChange(rebuild);
  roof.add(params, "roofRun", 1.5, 6, 0.1).name("Run").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "dies").name("Dies Into").listen().disable();
  readout.add(params, "valley").name("Valley").listen().disable();
  readout.add(params, "fit").name("Fit").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    shingle.dispose();
    clapboard.dispose();
    dormerRoof.dispose();
    seamLine.dispose();
    wire.dispose();
    dispose();
  };
}
