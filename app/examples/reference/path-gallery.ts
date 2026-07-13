import GUI from "lil-gui";
import { CatmullRomCurve3, DoubleSide, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { arcPath, circleProfile, curvePath, helixPath, joinPaths, linePath, type PathPoint, spiralPath, sweep, transformPath, transportFrames } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Path Gallery (sweep prototype)",
  description: "TEMPORARY — one profile, every path. The sweep never knows which one it is carrying.",
};

/**
 * The same tube, carried along every path the library can describe.
 *
 * A sweep has two halves: a PROFILE and a PATH. Change the profile and a masonry arch becomes wrought
 * iron tubing. Change the path and the same tubing becomes a ring, a corkscrew, a scroll, an archway.
 * Neither half knows the other exists — and that independence is the whole primitive.
 */
type PathName = "line" | "arc" | "ring" | "C (270°)" | "helix" | "spiral" | "curve" | "archway";

function buildPath(name: PathName, segments: number): { path: PathPoint[]; closed: boolean } {
  switch (name) {
    case "line":
      return { path: linePath(new Vector3(-1.5, 0, 0), new Vector3(1.5, 0, 0), segments), closed: false };

    case "arc":
      return { path: arcPath({ radius: 1.2, startAngle: 0, endAngle: Math.PI, segments }), closed: false };

    // 180° was never special. A full 2π is a closed ring — the decorative circles between
    // wrought iron pickets. `closed` wraps the seam and emits no caps.
    case "ring":
      return { path: arcPath({ radius: 1.1, startAngle: 0, endAngle: Math.PI * 2, segments }), closed: true };

    case "C (270°)":
      return {
        path: arcPath({ radius: 1.2, startAngle: -Math.PI * 0.25, endAngle: Math.PI * 1.25, segments }),
        closed: false,
      };

    case "helix":
      return { path: helixPath({ radius: 0.8, height: 2.4, turns: 3, segments: segments * 4 }), closed: false };

    case "spiral":
      return { path: spiralPath({ startRadius: 1.4, turns: 1.6, tightness: 0.22, segments: segments * 4 }), closed: false };

    // Any Three curve. It ANSWERS for its tangent — we never estimate it from the chords.
    case "curve":
      return {
        path: curvePath(
          new CatmullRomCurve3(
            [
              new Vector3(-1.6, -0.6, 0.4),
              new Vector3(-0.5, 0.8, -0.5),
              new Vector3(0.6, -0.5, 0.5),
              new Vector3(1.6, 0.7, -0.3),
            ],
            false,
            "centripetal",
          ),
          segments * 3,
        ),
        closed: false,
      };

    // Line, arc, line — composed. This is how the archway is built, and why `joinPaths` exists.
    // The straight legs are where Frenet frames are UNDEFINED, and where transport simply carries on.
    case "archway": {
      const r = 1.1;
      const leg = 0.9;

      return {
        path: joinPaths(
          linePath(new Vector3(-r, 0, 0), new Vector3(-r, leg, 0), 2),
          transformPath(
            arcPath({ radius: r, startAngle: Math.PI, endAngle: 0, segments }),
            new Matrix4().makeTranslation(0, leg, 0),
          ),
          linePath(new Vector3(r, leg, 0), new Vector3(r, 0, 0), 2),
        ),
        closed: false,
      };
    }
  }
}

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { background: 0x2f3540, cameraPosition: [0, 1, 5] });

  const params = {
    path: "archway" as PathName,
    radius: 0.09,
    sides: 8,
    segments: 24,
  };

  const material = new MeshStandardMaterial({
    color: "#c8ccd2",
    metalness: 0.75,
    roughness: 0.4,
    flatShading: true,
    side: DoubleSide,
  });

  let mesh = new Mesh(buildGeometry(), material);
  scene.add(mesh);

  function buildGeometry() {
    const { path, closed } = buildPath(params.path, params.segments);
    return sweep(circleProfile(params.radius, params.sides), transportFrames(path), { closed });
  }

  const rebuild = () => {
    mesh.geometry.dispose();
    scene.remove(mesh);
    mesh = new Mesh(buildGeometry(), material);
    scene.add(mesh);
  };

  const gui = new GUI();

  // THE PATH. One profile, every shape. The sweep never knows which it is carrying.
  gui
    .add(params, "path", ["line", "arc", "ring", "C (270°)", "helix", "spiral", "curve", "archway"])
    .name("Path")
    .onChange(rebuild);

  const section = gui.addFolder("Profile");
  section.add(params, "radius", 0.02, 0.35, 0.01).name("Radius").onChange(rebuild);
  // 4 gives square tubing — what real wrought iron is. 16 gives a round bar.
  section.add(params, "sides", 3, 20, 1).name("Sides").onChange(rebuild);
  section.open();

  gui.add(params, "segments", 4, 64, 1).name("Path Segments").onChange(rebuild);

  return () => {
    gui.destroy();
    mesh.geometry.dispose();
    material.dispose();
    dispose();
  };
}
