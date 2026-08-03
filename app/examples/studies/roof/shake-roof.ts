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
  Vector3,
  WireframeGeometry,
} from "three";
import { layPlankFloor, mulberry32 } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Shake Roof",
  description:
    "STUDY — one roof face covered in cedar shakes, and the budget question that decides how any tiled " +
    "roof gets built. " +
    "A shake costs FOUR TRIANGLES, because only its exposed part exists. Everything above the exposure " +
    "line is lapped by the course above and can never be seen, so it is not built: what remains is the top " +
    "face and the BUTT — the shake's thickness at its lower edge. Those two triangles are the entire look. " +
    "A shake roof is a stack of shadow lines, and the butt is what casts them; drop it and the roof " +
    "collapses into stripes on a plane. " +
    "That economy is the whole argument for shakes over barrel tiles. Measured on four faces of 6 x 4: " +
    "3040 shakes come to 12k triangles in ONE draw call, against 38k in two for the cheapest possible " +
    "barrel tile at only 960 units. Three times the pieces for a third of the cost — because a barrel's " +
    "arc is visible along its whole length and cannot be hidden the way a lap can. " +
    "The setting-out is not new and deliberately so: this calls `layPlankFloor`, the same packer the wood " +
    "floors use. A course is a row, the shake width is the board length, and the EXPOSURE is the board " +
    "width. It brings its stagger rule with it — end joints kept clear of the joints in the course below, " +
    "which is the single thing separating a laid roof from a set of stripes — and it reports what the " +
    "stagger actually achieved rather than what was asked for. It also brings the RUNT rule: a shake that " +
    "would strand an uncuttable sliver at the verge takes the remainder itself. " +
    "Shakes vary in width, so by the instance-or-merge rule they MERGE, with a per-shake tint baked to " +
    "vertex colours: one geometry, one material, one draw call, and no two shakes alike. Identical units " +
    "would have instanced instead. " +
    "EXPOSURE is an output wearing an input's clothing. It is what is left of the shake's length after the " +
    "headlap, and headlap is not decoration — it is what keeps water out. Wind it up and the roof gets " +
    "cheaper and starts to leak; wind it down and you are paying for shakes you have buried.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  SHAKE       a split (not sawn) wooden roofing unit. Thicker and rougher than a SHINGLE, which is sawn
//              and thinner — the geometry is the same, the butt is what differs.
//  BUTT        the shake's thick lower edge. The only part of its thickness that is ever visible, and the
//              thing that casts the shadow line a shake roof is made of.
//  EXPOSURE    how much of each shake shows — the course pitch. An OUTPUT: shake length minus headlap.
//  HEADLAP     how far a shake reaches up under the course above. Not ornament: it is the waterproofing.
//              The rule of thumb is exposure no more than a third of the length, so every point on the
//              roof has three thicknesses over it.
//  COURSE      one row of shakes, laid across the slope. Built from the eave upward, each lapping the last.
//  STAGGER     the offset between end joints in neighbouring courses. Align them and water runs straight
//              through; it is also the difference between a roof and a set of stripes.
//  VERGE       the sloping edge at the side of the roof face. Where the RUNT rule bites.
//  RAKE        the slope's own length, eave to ridge. Courses are counted along it, not along the plan.

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [3.4, 2.6, 4.2],
  });

  controls.target.set(0, -0.5, 1.2);
  controls.update();

  const key = new DirectionalLight(0xfff4e6, 1.55);
  // Low and raking up the slope, because the butt lines only exist as shadow.
  key.position.set(2.5, 3.2, 5);
  const bounce = new DirectionalLight(0x8ea8cc, 0.4);
  bounce.position.set(-2, -0.5, -2);
  scene.add(key, bounce);

  const cedar = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    side: DoubleSide,
  });
  const sheathing = new MeshStandardMaterial({ color: 0x2e2a26, roughness: 1, flatShading: true });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params = {
    pitch: 38,
    width: 4,
    rake: 3,

    shakeLength: 0.45,
    exposure: 0.15,
    minWidth: 0.09,
    maxWidth: 0.24,
    thickness: 0.018,
    minStagger: 0.1,

    jitter: 0.35,
    color: "#8a6f52",
    colorVariance: 0.09,
    seed: 0x51ab,

    butts: true,
    wireframe: false,

    laid: "",
    lap: "",
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
    const p = (params.pitch * Math.PI) / 180;
    // The face descends toward +Z. `up` runs UP THE SLOPE, `out` is the surface normal — every shake is
    // placed in these two, so nothing here needs to know the pitch again.
    const upSlope = new Vector3(0, Math.sin(p), -Math.cos(p));
    const out = new Vector3(0, Math.cos(p), Math.sin(p));
    const across = new Vector3(1, 0, 0);
    const eave = new Vector3(0, 0, 0);
    const at = (u: number, a: number, o: number) =>
      eave.clone().addScaledVector(upSlope, u).addScaledVector(across, a).addScaledVector(out, o);

    // The sheathing behind, so a gap in the covering reads as a gap.
    {
      const half = params.width / 2;
      const corners = [
        at(0, -half, 0),
        at(0, half, 0),
        at(params.rake, half, 0),
        at(params.rake, -half, 0),
      ];
      const tris = [
        [corners[0]!, corners[1]!, corners[2]!],
        [corners[0]!, corners[2]!, corners[3]!],
      ];
      const positions = new Float32Array(tris.length * 9);
      tris.forEach((t, i) => t.forEach((q, v) => positions.set([q.x, q.y, q.z], i * 9 + v * 3)));
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(positions, 3));
      g.computeVertexNormals();
      stage.add(new Mesh(g, sheathing));
    }

    // THE SETTING-OUT IS NOT NEW. A course is a row, a shake's width is the board length, and the
    // EXPOSURE is the board width — so the wood floors' packer lays this roof unchanged, stagger rule and
    // runt rule included.
    const layout = layPlankFloor({
      length: params.width,
      depth: params.rake,
      plankWidth: params.exposure,
      gap: 0,
      minPlankLength: params.minWidth,
      maxPlankLength: params.maxWidth,
      minStagger: params.minStagger,
      seed: params.seed,
    });

    const random = mulberry32(params.seed ^ 0x9e37);
    const base = new Color(params.color);
    const tint = new Color();
    const triangles: Vector3[][] = [];
    const colors: Color[] = [];

    for (const shake of layout.placements) {
      // `across` runs from the face's near edge; centre it. `row` counts up the slope from the eave.
      const a0 = shake.start - params.width / 2;
      const a1 = a0 + shake.length;
      const butt = shake.row * layout.plankWidth;
      const head = butt + layout.plankWidth;

      // Hand-split, so each sits a little proud and a little skew. Free — it is vertex offsets, not
      // geometry, and it is most of what stops 700 rectangles reading as graph paper.
      const lift = params.thickness * (1 + params.jitter * (random() - 0.5) * 2);
      const skew = params.jitter * (random() - 0.5) * layout.plankWidth * 0.25;

      const bl = at(butt, a0, lift);
      const br = at(butt, a1, lift + skew * 0.15);
      const hr = at(head, a1, lift + skew);
      const hl = at(head, a0, lift + skew * 0.5);
      // The exposed face.
      triangles.push([bl, br, hr], [bl, hr, hl]);
      // THE BUTT — the shake's thickness at its lower edge, dropped to the surface. Two triangles, and
      // the entire reason a shake roof reads as a roof rather than as stripes on a plane.
      if (params.butts) {
        const dl = at(butt, a0, 0);
        const dr = at(butt, a1, 0);
        triangles.push([dl, dr, br], [dl, br, bl]);
      }

      tint
        .copy(base)
        .offsetHSL(
          (random() - 0.5) * params.colorVariance * 0.35,
          (random() - 0.5) * params.colorVariance,
          (random() - 0.5) * params.colorVariance,
        );
      const faces = params.butts ? 4 : 2;
      for (let f = 0; f < faces; f++) colors.push(tint.clone());
    }

    const positions = new Float32Array(triangles.length * 9);
    const colorAttr = new Float32Array(triangles.length * 9);
    triangles.forEach((t, i) => {
      t.forEach((q, v) => positions.set([q.x, q.y, q.z], i * 9 + v * 3));
      const c = colors[i]!;
      for (let v = 0; v < 3; v++) colorAttr.set([c.r, c.g, c.b], i * 9 + v * 3);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("color", new BufferAttribute(colorAttr, 3));
    geometry.computeVertexNormals();
    stage.add(new Mesh(geometry, cedar));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));

    // --- readouts --------------------------------------------------------
    const headlap = params.shakeLength - layout.plankWidth;
    const ratio = layout.plankWidth / params.shakeLength;
    params.laid = `${layout.placements.length} shakes · ${layout.rows} courses · exposure ${layout.plankWidth.toFixed(3)} (asked ${params.exposure.toFixed(3)})`;
    params.lap =
      headlap <= 0
        ? `NO HEADLAP — exposure exceeds the shake, the roof is open`
        : `headlap ${headlap.toFixed(3)} · exposure is ${(ratio * 100).toFixed(0)}% of the shake — ${ratio > 0.34 ? "over a third, thin cover" : "under a third, three thicknesses everywhere"}`;
    params.cost = `${triangles.length} triangles · 1 draw call · stagger reached ${layout.closestJoint.toFixed(3)} of ${params.minStagger.toFixed(3)} asked`;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Shake Roof");

  const shake = gui.addFolder("Shakes");
  // Exposure is what is LEFT of the shake after the headlap, so these two are one decision seen twice.
  shake.add(params, "shakeLength", 0.2, 0.9, 0.01).name("Shake Length").onChange(rebuild);
  shake.add(params, "exposure", 0.05, 0.4, 0.005).name("Exposure").onChange(rebuild);
  shake.add(params, "minWidth", 0.04, 0.3, 0.005).name("Min Width").onChange(rebuild);
  shake.add(params, "maxWidth", 0.06, 0.5, 0.005).name("Max Width").onChange(rebuild);
  // The butt IS the look. Turn it off and the roof becomes stripes on a plane.
  shake.add(params, "thickness", 0.004, 0.06, 0.002).name("Butt Thickness").onChange(rebuild);
  shake.add(params, "butts").name("Butts").onChange(rebuild);
  shake.open();

  const lay = gui.addFolder("Laying");
  // The single rule separating a laid roof from a set of stripes. A target, not a guarantee — the
  // readout says what was actually reached.
  lay.add(params, "minStagger", 0, 0.3, 0.005).name("Min Stagger").onChange(rebuild);
  lay.add(params, "jitter", 0, 1, 0.05).name("Hand-split Jitter").onChange(rebuild);
  lay.add(params, "seed", 0, 65535, 1).name("Seed").onChange(rebuild);
  lay.open();

  const face = gui.addFolder("Roof Face");
  face.add(params, "pitch", 10, 65, 1).name("Pitch").onChange(rebuild);
  face.add(params, "width", 1, 8, 0.1).name("Width").onChange(rebuild);
  // The rake — the slope's own length. Courses are counted along it, not along the plan.
  face.add(params, "rake", 1, 6, 0.1).name("Rake").onChange(rebuild);

  const colour = gui.addFolder("Colour");
  colour.addColor(params, "color").name("Color").onChange(rebuild);
  colour.add(params, "colorVariance", 0, 0.3, 0.005).name("Color Variance").onChange(rebuild);

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "wireframe").name("Wireframe").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  readout.add(params, "laid").name("Laid").listen().disable();
  readout.add(params, "lap").name("Lap").listen().disable();
  readout.add(params, "cost").name("Cost").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    cedar.dispose();
    sheathing.dispose();
    wire.dispose();
    dispose();
  };
}
