import GUI from "lil-gui";
import {
  BackSide,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import {
  MoldingGeometry,
  surfaceProfile,
  type MoldingStyle,
  type SurfaceStyle,
} from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Curved Runs",
  description:
    "STUDY — molding run around CURVES, which is the Inside And Outside Corners study taken to its limit. The " +
    "room is the inside corner with forty-eight of them; every column is the pier with sixteen. Nothing " +
    "new is needed, because a circle is just a closed run with a lot of corners: the cornice and base are " +
    "CONCAVE rings mitered inward, and each column's foot, necking and cap are CONVEX rings mitered " +
    "outward. Two knobs carry the real lesson — Wall Sides and Column Sides drive the drum AND its " +
    "molding, so their facets cannot disagree and each section's flat back sits on the surface with no " +
    "gap. Drop them to 8 and the rotunda becomes an octagon with perfectly correct molding; the geometry " +
    "never notices it stopped being round.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  ROTUNDA    a round building or room. The wall itself is the DRUM.
//  COLONNADE  a row of columns. Around a circle, a PERISTYLE.
//  SHAFT      the plain body of a column.
//  NECKING    the band at the top of the shaft, below the capital. An ASTRAGAL when it is a bead — the
//             decorative ring you see near, but not at, the top.
//  ANNULET    the plainer rings under a Doric echinus. Same construction, no bead.
//  TORUS      the fat convex ring at a column's foot. A large bead.
//  ABACUS     the flat slab crowning a capital.
//  ARCHITRAVE the beam spanning column to column, lowest member of the entablature.

/**
 * A ring of path points at a radius.
 *
 * Wound to match `CylinderGeometry`, which puts its vertices at `(r·sinθ, ·, r·cosθ)` from `θ = 0` — so a
 * ring built the same way lands ON the drum's own edges rather than between them. That is what lets a
 * section's flat back sit flush instead of bridging a facet.
 */
const ringPoints = (radius: number, sides: number, y: number) =>
  Array.from({ length: Math.max(3, Math.round(sides)) }, (_, i) => {
    const angle = (i / Math.max(3, Math.round(sides))) * Math.PI * 2;
    return new Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
  });

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x1b1f26,
    cameraPosition: [5.4, 5.6, 7.2],
  });

  camera.fov = 32;
  camera.updateProjectionMatrix();
  controls.target.set(0, 1.3, 0);
  controls.update();

  const key = new DirectionalLight(0xfff4e2, 1.3);
  key.position.set(3, 6, 4);
  const bounce = new DirectionalLight(0x8fa8c8, 0.55);
  bounce.position.set(-4, 1.5, -3);
  scene.add(key, bounce);

  const params = {
    radius: 3,
    wallHeight: 3.4,
    wallSides: 48,

    cornice: true,
    corniceStyle: "ogee" as MoldingStyle,
    corniceDrop: 0.26,
    corniceProjection: 0.2,

    skirting: true,
    skirtingStyle: "cyma" as MoldingStyle,
    skirtingDrop: 0.2,
    skirtingProjection: 0.05,

    columns: 12,
    columnInset: 0.45,
    columnHeight: 2.5,
    columnRadius: 0.17,
    columnSides: 16,

    torus: true,
    necking: true,
    neckingStyle: "astragal" as SurfaceStyle,
    neckingAt: 0.88,
    neckingHeight: 0.1,
    neckingProjection: 0.028,
    capital: true,
    architrave: true,

    segments: 6,
    facets: "",
    budget: "",
  };

  const stone = new MeshStandardMaterial({ color: 0xd7cfc0, roughness: 0.95, flatShading: true });
  const plaster = new MeshStandardMaterial({ color: 0xefe9dd, roughness: 0.9, flatShading: true });
  // BackSide, so the near wall is culled and the rotunda reads as a cutaway rather than a closed drum.
  const drum = new MeshStandardMaterial({ color: 0xb4ab9b, roughness: 1, side: BackSide });
  const floorPaint = new MeshStandardMaterial({ color: 0x6f6355, roughness: 0.95, side: DoubleSide });
  // A band seen from both faces — hoisted, because building it inside the rebuild leaks one material per
  // slider frame.
  const beam = new MeshStandardMaterial({
    color: 0xd7cfc0,
    roughness: 0.95,
    flatShading: true,
    side: DoubleSide,
  });

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    // Meshes SHARE geometry here — one column's parts are built once and placed many times — so collect
    // the distinct ones and release each exactly once.
    const seen = new Set<BufferGeometry>();
    for (const child of [...stage.children]) {
      if (child instanceof Mesh) {
        seen.add(child.geometry);
        stage.remove(child);
      }
    }
    for (const geometry of seen) geometry.dispose();
  };

  const rebuild = () => {
    clear();
    const { radius, wallHeight, wallSides, columnSides, columnRadius, columnHeight } = params;

    const floor = new Mesh(new CircleGeometry(radius, wallSides).rotateX(-Math.PI / 2), floorPaint);
    floor.receiveShadow = true;
    stage.add(floor);

    stage.add(
      new Mesh(
        new CylinderGeometry(radius, radius, wallHeight, wallSides, 1, true).translate(0, wallHeight / 2, 0),
        drum,
      ),
    );

    // ── The room: CONCAVE rings. The molding is inside the drum, so it faces inward and the miters at
    //    every one of the wall's corners eat toward each other. They never meet, because a circle's
    //    segments shrink as sin(θ/2) while the overrun needs only tan(θ/2) — the margin only improves.
    if (params.cornice) {
      stage.add(
        new Mesh(
          new MoldingGeometry({
            points: ringPoints(radius, wallSides, wallHeight),
            closed: true,
            run: "crown",
            facing: "inward",
            style: params.corniceStyle,
            drop: params.corniceDrop,
            projection: params.corniceProjection,
            segments: params.segments,
          }),
          plaster,
        ),
      );
    }

    if (params.skirting) {
      stage.add(
        new Mesh(
          new MoldingGeometry({
            points: ringPoints(radius, wallSides, 0),
            closed: true,
            run: "base",
            facing: "inward",
            style: params.skirtingStyle,
            drop: params.skirtingDrop,
            projection: params.skirtingProjection,
            segments: params.segments,
          }),
          plaster,
        ),
      );
    }

    // ── The colonnade: CONVEX rings. Built ONCE at the origin and placed many times, because every column
    //    is the same column. Convex runs have no width limit at all, so these never need checking.
    const count = Math.max(3, Math.round(params.columns));
    const at = radius - params.columnInset;

    const shaft = new CylinderGeometry(columnRadius, columnRadius, columnHeight, columnSides).translate(
      0,
      columnHeight / 2,
      0,
    );

    const parts: BufferGeometry[] = [shaft];

    // The foot: shaft meets floor, which is a genuine CORNER — two surfaces — so it takes a corner section.
    if (params.torus) {
      parts.push(
        new MoldingGeometry({
          points: ringPoints(columnRadius, columnSides, 0),
          closed: true,
          run: "base",
          facing: "outward",
          style: "ovolo",
          drop: columnRadius * 0.7,
          projection: columnRadius * 0.45,
          segments: params.segments,
        }),
      );
    }

    // The NECKING: no corner anywhere near it — it sits on the shaft's face, so it takes a SURFACE section.
    // One column, both families, which is the neatest statement of the difference in the library.
    if (params.necking) {
      parts.push(
        new MoldingGeometry({
          points: ringPoints(columnRadius, columnSides, columnHeight * params.neckingAt),
          closed: true,
          run: "base",
          facing: "outward",
          profile: surfaceProfile({
            style: params.neckingStyle,
            height: params.neckingHeight,
            projection: params.neckingProjection,
            segments: params.segments,
          }),
        }),
      );
    }

    // The head: shaft meets abacus. A corner again, upside down.
    if (params.capital) {
      const abacus = columnRadius * 0.5;
      parts.push(
        new MoldingGeometry({
          points: ringPoints(columnRadius, columnSides, columnHeight),
          closed: true,
          run: "crown",
          facing: "outward",
          style: "cyma",
          drop: columnRadius * 0.8,
          projection: abacus,
          segments: params.segments,
        }),
        new CylinderGeometry(
          columnRadius + abacus * 1.1,
          columnRadius + abacus * 1.1,
          columnRadius * 0.35,
          columnSides,
        ).translate(0, columnHeight + columnRadius * 0.175, 0),
      );
    }

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      for (const geometry of parts) {
        const mesh = new Mesh(geometry, stone);
        mesh.position.set(Math.sin(angle) * at, 0, Math.cos(angle) * at);
        mesh.castShadow = true;
        stage.add(mesh);
      }
    }

    if (params.architrave) {
      // The beam the colonnade carries. A plain band, so the columns read as holding something up.
      const depth = params.columnRadius * 2.2;
      stage.add(
        new Mesh(
          new CylinderGeometry(at + depth / 2, at + depth / 2, columnRadius * 1.1, wallSides, 1, true)
            .translate(0, columnHeight + columnRadius * 0.9, 0),
          beam,
        ),
      );
    }

    // The lesson, as numbers: how far a flat facet dips inside the true circle it stands for.
    const dip = (r: number, sides: number) => (r - r * Math.cos(Math.PI / Math.max(3, sides))) * 1000;
    params.facets = `wall ${dip(radius, wallSides).toFixed(1)}mm · column ${dip(columnRadius, columnSides).toFixed(2)}mm`;
    let tris = 0;
    const counted = new Set<BufferGeometry>();
    for (const child of stage.children) {
      if (child instanceof Mesh && !counted.has(child.geometry)) {
        counted.add(child.geometry);
        const index = child.geometry.getIndex();
        tris += (index ? index.count : child.geometry.getAttribute("position").count) / 3;
      }
    }
    params.budget = `${tris.toFixed(0)} tris across ${counted.size} distinct geometries`;
  };
  rebuild();

  const CORNER_STYLES: Record<string, MoldingStyle> = {
    "Cove (cavetto)": "cove",
    Ovolo: "ovolo",
    Chamfer: "chamfer",
    "Ogee (cyma recta)": "ogee",
    "Cyma (reversa)": "cyma",
    Scotia: "scotia",
    "Fillet (plain band)": "fillet",
    "Step (corbel)": "step",
  };
  const SURFACE_STYLES: Record<string, SurfaceStyle> = {
    "Fillet (plain band)": "fillet",
    Bead: "bead",
    Astragal: "astragal",
    "Reed (reeding)": "reed",
    Ovolo: "ovolo",
    Ogee: "ogee",
    "Lip (undercut)": "lip",
  };

  const gui = new GUI();
  gui.title("Curved Runs");

  const room = gui.addFolder("Rotunda");
  room.add(params, "radius", 1.5, 5, 0.1).name("Radius").onChange(rebuild);
  room.add(params, "wallHeight", 2, 5, 0.1).name("Wall Height").onChange(rebuild);
  // ONE number for the drum and its molding both. That is the whole trick: their facets cannot disagree.
  room.add(params, "wallSides", 6, 96, 1).name("Wall Sides").onChange(rebuild);
  room.open();

  const cornice = gui.addFolder("Cornice (concave ring)");
  cornice.add(params, "cornice").name("Show").onChange(rebuild);
  cornice.add(params, "corniceStyle", CORNER_STYLES).name("Section").onChange(rebuild);
  cornice.add(params, "corniceDrop", 0.05, 0.6, 0.01).name("Drop").onChange(rebuild);
  cornice.add(params, "corniceProjection", 0.03, 0.5, 0.01).name("Projection").onChange(rebuild);
  cornice.open();

  const skirting = gui.addFolder("Base (concave ring)");
  skirting.add(params, "skirting").name("Show").onChange(rebuild);
  skirting.add(params, "skirtingStyle", CORNER_STYLES).name("Section").onChange(rebuild);
  skirting.add(params, "skirtingDrop", 0.05, 0.5, 0.01).name("Height").onChange(rebuild);
  skirting.add(params, "skirtingProjection", 0.02, 0.25, 0.005).name("Projection").onChange(rebuild);

  const colonnade = gui.addFolder("Colonnade (convex rings)");
  colonnade.add(params, "columns", 3, 32, 1).name("Columns").onChange(rebuild);
  colonnade.add(params, "columnInset", 0.15, 1.5, 0.05).name("Inset From Wall").onChange(rebuild);
  colonnade.add(params, "columnHeight", 1.2, 4, 0.05).name("Height").onChange(rebuild);
  colonnade.add(params, "columnRadius", 0.06, 0.4, 0.01).name("Shaft Radius").onChange(rebuild);
  // Same trick as the drum: the shaft and its three rings share one facet count.
  colonnade.add(params, "columnSides", 3, 48, 1).name("Column Sides").onChange(rebuild);
  colonnade.add(params, "architrave").name("Architrave").onChange(rebuild);
  colonnade.open();

  const column = gui.addFolder("Column Molding");
  // The foot and the head are CORNERS — shaft against floor, shaft against abacus — so they take corner
  // sections. The necking is not: it sits on the shaft's own face, and takes a surface section.
  column.add(params, "torus").name("Torus (foot)").onChange(rebuild);
  column.add(params, "capital").name("Capital (head)").onChange(rebuild);
  column.add(params, "necking").name("Necking (shaft face)").onChange(rebuild);
  column.add(params, "neckingStyle", SURFACE_STYLES).name("Necking Section").onChange(rebuild);
  // Near the top, not at it — which is what makes it read as a necking rather than a capital.
  column.add(params, "neckingAt", 0.5, 1, 0.01).name("Height On Shaft").onChange(rebuild);
  column.add(params, "neckingHeight", 0.03, 0.25, 0.005).name("Band Height").onChange(rebuild);
  column.add(params, "neckingProjection", 0.005, 0.08, 0.002).name("Projection").onChange(rebuild);
  column.open();

  const detail = gui.addFolder("Detail");
  detail.add(params, "segments", 1, 16, 1).name("Section Segments").onChange(rebuild);

  const readout = gui.addFolder("Readout");
  // How far each flat facet dips inside the circle it stands for — the cost of faking a curve.
  readout.add(params, "facets").name("Facet Dip").listen().disable();
  readout.add(params, "budget").name("Geometry").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    plaster.dispose();
    drum.dispose();
    floorPaint.dispose();
    beam.dispose();
    dispose();
  };
}
