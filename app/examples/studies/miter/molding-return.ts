import GUI from "lil-gui";
import {
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  Vector3,
  WireframeGeometry,
} from "three";
import {
  createGeometryBuffers,
  linePath,
  MoldingGeometry,
  miterCuts,
  miterFrames,
  moldingProfile,
  type MoldingStyle,
  pushQuad,
  pushTriangle,
  type Station,
  sweep,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { createTextSprite } from "../../../framework/createTextSprite";

export const meta = {
  title: "Molding Return",
  description:
    "STUDY — what it takes to close the END of a molding run. A run that just stops shows its whole " +
    "section to the room, which is why a joiner RETURNS it: the profile wraps around and dies on the wall. " +
    "SQUARE is the bare end, the thing being fixed. ONE PATH adds a leg to the same run — the obvious " +
    "move, and it hides a trap, because `facing` is judged from the run's centre and adding the leg moves " +
    "that centre. TWO PIECE builds it as a joiner does, two lengths sharing one mitered plane off " +
    "`miterCuts`; that settles the facing, since each piece is framed from its own path, but a swept leg " +
    "carries a CONSTANT section and so still ends in a full square face. LOFT is the answer: take the " +
    "run's own mitered end RING and carry every point of it back to the wall. The ring is slanted, so it " +
    "already touches the wall along one edge and stands clear at the other — the taper falls out, with no " +
    "trimming at all. Watch `leg cap`: the swept leg leaves a whole section standing on its outer plane, " +
    "the loft leaves two vertices and no area.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  RETURN     a run's end wrapped back to the surface it stands on, so no section face shows. Named for
//             the piece that "returns to the wall".
//  BARE END   a square cut showing the whole section. Correct only where the run dies into something —
//             a door casing, another wall, a chimney breast.
//  BREAK      a cornice wrapping a projection. Often called a return too, and it is a different thing:
//             pure path, and it already works. See inside-and-outside-corners.

const WALL_LENGTH = 2;
const ROOM = 1; // The room is at +z; the wall's face is z = 0.

type EndStyle = "square" | "onePath" | "twoPiece" | "loft";

/**
 * THE CANDIDATE — the return as a LOFT, not a sweep.
 *
 * A joiner's return piece tapers to nothing, and a swept leg cannot: `sweep` carries a CONSTANT section,
 * so however long the leg is it ends in a full square face. But look at what the piece actually is — the
 * region between the run's mitered end and the wall. So take the run's own end RING and carry every point
 * of it straight back to the wall plane.
 *
 * The taper comes free, and for the same reason the raised panel's hip did: the ring is SLANTED, so it
 * already touches the wall along one edge and stands `projection` clear at the other. Lofting it to its
 * own shadow gives a band that has real depth at the outer edge and vanishes at the wall. No trimming, no
 * second plane — the two planes were the miter (which made the ring) and the wall (which makes the
 * shadow), and lofting between them IS the intersection.
 */
function loftToWall(station: Station, profile: Vec2[], wallZ: number): BufferGeometry {
  // Mirrors how `sweep` places a profile: position + normal * px + binormal * py, at the frame vectors'
  // own length — which is where the miter's widening lives.
  const ring = profile.map(([px, py]) =>
    station.position.clone().addScaledVector(station.normal, px).addScaledVector(station.binormal, py),
  );
  const shadow = ring.map((p) => new Vector3(p.x, p.y, wallZ));
  const at = (p: Vector3): Vec3 => [p.x, p.y, p.z];

  const buffers = createGeometryBuffers();
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    // Where the ring already lies on the wall the band has no area — that IS the taper, and a zero-area
    // quad has no normal to compute from.
    if (Math.abs(ring[i]!.z - wallZ) < 1e-9 && Math.abs(ring[j]!.z - wallZ) < 1e-9) continue;
    pushQuad(buffers, [at(ring[j]!), at(ring[i]!), at(shadow[i]!), at(shadow[j]!)], undefined);
  }

  // The shadow closes the piece against the wall. Hidden in place, but a closed solid measures, exports,
  // and shadows correctly, and it costs a fan.
  for (let i = 1; i < shadow.length - 1; i++) {
    pushTriangle(buffers, [at(shadow[0]!), at(shadow[i + 1]!), at(shadow[i]!)], [0, 0, -1]);
  }

  return toBufferGeometry(buffers);
}

interface Params {
  end: EndStyle;
  run: "crown" | "base";
  style: MoldingStyle;
  drop: number;
  projection: number;
  segments: number;
  legLength: number;
  wallHeight: number;
  wallThickness: number;
  wireframe: boolean;
  opacity: number;
  showWall: boolean;
  bodyZ: string;
  legCap: string;
  verdict: string;
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x14171d,
    cameraPosition: [1.5, 1.5, 2.2],
  });

  // The subject is a few centimetres across on a two-metre wall, so this needs both a long lens and a
  // near plane far tighter than the 0.1 default.
  camera.fov = 20;
  camera.near = 0.005;
  camera.updateProjectionMatrix();
  controls.target.set(-0.15, 0.12, 0.05);
  controls.update();

  const key = new DirectionalLight(0xffffff, 1.3);
  key.position.set(0.9, 1.1, 1.4);
  const bounce = new DirectionalLight(0x9fb4d0, 0.5);
  bounce.position.set(-0.7, -0.3, 0.8);
  scene.add(key, bounce);

  const plaster = new MeshStandardMaterial({
    color: 0xd8d2c6,
    roughness: 0.9,
    flatShading: true,
    side: DoubleSide,
    // Push the solid back a hair so the wireframe overlay wins the depth test instead of fighting it.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const legPaint = new MeshStandardMaterial({
    color: 0xe4b06b,
    roughness: 0.85,
    flatShading: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const stone = new MeshStandardMaterial({ color: 0x8f96a0, roughness: 1 });
  const wire = new LineBasicMaterial({ color: 0x00e5ff });

  const params: Params = {
    end: "twoPiece",
    run: "base",
    style: "ogee",
    drop: 0.09,
    projection: 0.05,
    segments: 6,
    legLength: 0.05,
    wallHeight: 1.2,
    wallThickness: 0.1,
    wireframe: false,
    opacity: 1,
    showWall: true,
    bodyZ: "",
    legCap: "",
    verdict: "",
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh || child instanceof LineSegments) {
        child.geometry.dispose();
        stage.remove(child);
      } else if (child instanceof Sprite) {
        // The label is rebuilt rather than retextured, because its canvas is sized to its own string.
        child.material.map?.dispose();
        child.material.dispose();
        stage.remove(child);
      }
    }
  };

  const add = (geometry: BufferGeometry, material: MeshStandardMaterial) => {
    stage.add(new Mesh(geometry, material));
    if (params.wireframe) stage.add(new LineSegments(new WireframeGeometry(geometry), wire));
  };

  /** The run's corner line, ending at the origin so the end under study is always at a known place. */
  const runLine = (y: number) => ({
    from: new Vector3(-WALL_LENGTH / 2, y, 0),
    corner: new Vector3(0, y, 0),
  });

  /**
   * TWO PIECE — the joiner's construction, and the one that fixes the flip.
   *
   * Each length is framed from ITS OWN path, so neither has a centre that the other can move; they agree
   * only because they are cut on the same supplied plane. That is exactly the picture frame's four
   * sticks, with three points instead of four.
   *
   * Dropping to `sweep` here is itself a finding: `MoldingGeometry` has no way to say "cut this end on a
   * plane I am giving you", so it cannot express a run built as separate pieces.
   */
  const mitredRun = (y: number, legEnd: Vector3) => {
    const { from, corner } = runLine(y);
    const profile = moldingProfile({
      style: params.style,
      drop: params.drop,
      projection: params.projection,
      segments: params.segments,
    });
    // The profile's `x` runs along the wall away from the corner line, so DOWN hangs a crown and UP
    // stands a base. With the run heading +x this puts the section's projection on +z, into the room.
    const reference = new Vector3(0, params.run === "crown" ? -1 : 1, 0);
    // The plane the end is cut on. The leg only has to name a DIRECTION for the bisector to exist — its
    // length never enters, which is why the loft construction ignores Leg Length entirely.
    const cuts = miterCuts([from, corner, legEnd]);
    const stations = miterFrames(linePath(from, corner, 1), {
      reference,
      endCut: cuts[1],
      widenSeatCuts: true,
    });

    return { profile, reference, cuts, stations, corner, legEnd };
  };

  const rebuild = () => {
    clear();
    const y = params.run === "crown" ? params.wallHeight : 0;
    const { from, corner } = runLine(y);
    // The leg heads OUT from the wall. That is not a free choice: with the run travelling +x, a leg on
    // +z puts the section's own projection on −x, which is the side the run's end face is on. A leg the
    // other way lands the material in front of the end instead of behind it.
    const legEnd = new Vector3(0, y, params.legLength);

    if (params.showWall) {
      // Wall and floor share one span and one origin — otherwise one oversails the other and the
      // overhang reads as a defect in the molding rather than in the room.
      const span = WALL_LENGTH + 0.6;
      add(
        new BoxGeometry(span, params.wallHeight, params.wallThickness).translate(
          0,
          params.wallHeight / 2,
          -params.wallThickness / 2,
        ),
        stone,
      );
      add(new BoxGeometry(span, 0.02, ROOM).translate(0, -0.01, ROOM / 2), stone);
    }

    const section = {
      style: params.style,
      drop: params.drop,
      projection: params.projection,
      segments: params.segments,
      run: params.run,
    } as const;

    let body: BufferGeometry;
    let leg: BufferGeometry | null = null;

    if (params.end === "square") {
      body = new MoldingGeometry({ points: [from, corner], ...section });
      add(body, plaster);
    } else if (params.end === "onePath") {
      // One run, three points. The leg is just another corner — which is the claim under test.
      body = new MoldingGeometry({ points: [from, corner, legEnd], ...section });
      add(body, plaster);
    } else {
      const { profile, reference, cuts, stations } = mitredRun(y, legEnd);
      body = sweep(profile, stations);
      add(body, plaster);

      leg =
        params.end === "twoPiece"
          ? // A second LENGTH, swept along the leg — constant section, so it must end square.
            sweep(
              profile,
              miterFrames(linePath(corner, legEnd, 1), {
                reference,
                startCut: cuts[1],
                widenSeatCuts: true,
              }),
            )
          : // The candidate: the run's own end ring, carried to the wall.
            loftToWall(stations[1]!, profile, 0);
      add(leg, legPaint);
    }

    for (const material of [plaster, legPaint, stone]) {
      material.opacity = params.opacity;
      // Only pay for transparency when it is asked for — a fully opaque transparent material still takes
      // the sorted back-to-front path and drops out of the depth buffer.
      material.transparent = params.opacity < 1;
      material.depthWrite = params.opacity >= 1;
    }

    // Where the run's BODY sits in z tells you whether `facing` survived. The room is at +z; anything at
    // negative z is inside the wall.
    body.computeBoundingBox();
    const bb = body.boundingBox!;
    params.bodyZ = `[${bb.min.z.toFixed(4)}, ${bb.max.z.toFixed(4)}]`;
    const flipped = bb.min.z < -1e-6;

    // How many vertices the return leaves standing at its outermost plane. A constant swept section
    // leaves a WHOLE profile there — that is the square cut. A tapered one leaves an edge.
    const outermost = (geometry: BufferGeometry) => {
      const position = geometry.attributes.position!;
      let max = -Infinity;
      for (let i = 0; i < position.count; i++) max = Math.max(max, position.getZ(i));
      let count = 0;
      for (let i = 0; i < position.count; i++) if (Math.abs(position.getZ(i) - max) < 1e-6) count++;
      return { max, count };
    };

    if (leg) {
      const { max, count } = outermost(leg);
      params.legCap = `z = ${max.toFixed(4)}, ${count} verts on that plane`;
    } else if (params.end === "onePath") {
      params.legCap = `z = ${bb.max.z.toFixed(4)} (wall is z = 0)`;
    } else {
      params.legCap = "none — bare end";
    }

    params.verdict = flipped
      ? "FACING FLIPPED — the run is inside the wall"
      : params.end === "square"
        ? "section face exposed to the room"
        : params.end === "loft"
          ? "wrapped and tapered — dies on the wall"
          : "wrapped, but the leg still ends square";

    const text =
      params.end === "square"
        ? "SQUARE — bare end"
        : params.end === "onePath"
          ? "ONE PATH — leg on the same run"
          : params.end === "twoPiece"
            ? "TWO PIECE — shared cut plane"
            : "LOFT — end ring carried to the wall";
    const tint = params.end === "square" ? "#ff9d6b" : flipped ? "#ff6b6b" : "#7fe3a1";
    stage.add(
      createTextSprite(text, {
        font: "ui-monospace, monospace",
        weight: "bold",
        size: 64,
        color: tint,
        scale: 0.05,
        x: -0.25,
        y: params.run === "crown" ? params.wallHeight + 0.16 : 0.34,
        z: 0.1,
      }),
    );
  };
  rebuild();

  const gui = new GUI();
  gui.title("Molding Return");

  const end = gui.addFolder("End Treatment");
  end
    .add(params, "end", {
      "Square — bare end": "square",
      "One Path — leg on the run": "onePath",
      "Two Piece — shared cut": "twoPiece",
      "Loft — ring to the wall": "loft",
    })
    .name("Construction")
    .onChange(rebuild);
  // A real return wraps by exactly the section's projection. Shorter leaves the end face showing;
  // longer overshoots, because a swept leg cannot taper.
  end.add(params, "legLength", 0.005, 0.2, 0.005).name("Leg Length").onChange(rebuild);
  end.open();

  const section = gui.addFolder("Section");
  section
    .add(params, "run", { "Base (baseboard)": "base", "Crown (cornice)": "crown" })
    .name("Run")
    .onChange(rebuild);
  section
    .add(params, "style", {
      "Cove (cavetto)": "cove",
      Ovolo: "ovolo",
      Chamfer: "chamfer",
      "Ogee (cyma recta)": "ogee",
      "Cyma (reversa)": "cyma",
      Scotia: "scotia",
      "Fillet (plain band)": "fillet",
      "Step (corbel)": "step",
    })
    .name("Profile")
    .onChange(rebuild);
  section.add(params, "drop", 0.02, 0.25, 0.005).name("Drop").onChange(rebuild);
  // Set Leg Length equal to this and the wrap is exactly as deep as the molding stands out.
  section.add(params, "projection", 0.01, 0.15, 0.005).name("Projection").onChange(rebuild);
  section.add(params, "segments", 1, 16, 1).name("Segments").onChange(rebuild);
  section.open();

  const inspect = gui.addFolder("Inspect");
  inspect.add(params, "showWall").name("Wall").onChange(rebuild);
  inspect.add(params, "wireframe").name("Wireframe Overlay").onChange(rebuild);
  inspect.add(params, "opacity", 0.15, 1, 0.01).name("Opacity").onChange(rebuild);
  inspect.add(params, "wallHeight", 0.6, 2.4, 0.05).name("Wall Height").onChange(rebuild);
  inspect.open();

  // Read-only: what the construction actually produced, not knobs.
  const readout = gui.addFolder("Readout");
  readout.add(params, "bodyZ").name("Run body z").listen().disable();
  readout.add(params, "legCap").name("Leg cap").listen().disable();
  readout.add(params, "verdict").name("Verdict").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    // `clear` already disposes the label's canvas texture and material along with the meshes.
    clear();
    plaster.dispose();
    legPaint.dispose();
    stone.dispose();
    wire.dispose();
    dispose();
  };
}
