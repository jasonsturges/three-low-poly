import GUI from "lil-gui";
import { AxesHelper, DoubleSide, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { circleProfile, type PathPoint, sweep, transportFrames } from "three-low-poly";
import { createOrthographicScene } from "../../framework/createOrthographicScene";

export const meta = {
  title: "Smoke Curl (sweep prototype)",
  description: "TEMPORARY — a stylized trail. The same sweep as the arch and the scroll, tapered to nothing.",
};

interface CurlOptions {
  /** How far the curl swings out from its axis by the top. */
  swirl: number;
  /** How high it rises. */
  height: number;
  /** How many times it wraps around as it climbs. */
  turns: number;
  /** Thickness at the root. */
  radius: number;
  /** Thickness at the tip, as a fraction of the root. Drive it to 0 and the trail dissolves to a point. */
  taper: number;
  /** Stations along the path — the smoothness of the curl. */
  segments: number;
  /** Sides of the cross-section. `4` gives a hard-edged ribbon, `16` a round wisp. */
  sides: number;
}

/**
 * A rising, wrapping curl — the stylized steam trailing a boat, or the smoke off a snuffed candle.
 *
 * THIS IS THE FIRST PATH THAT LEAVES ITS PLANE. The arch and the scroll are both flat, so their
 * frames only ever had to survive straight runs and changing curvature. A curl has **torsion**: it
 * twists out of any plane you could draw through it, which is exactly the case where Frenet frames
 * spin the cross-section like a corkscrew for no reason. Parallel transport carries the section
 * along without ever spinning it, and this is where you can see that it does.
 *
 * The tangent is again analytic. For `r(t)·(cos θ, ·, sin θ)` climbing in Y:
 *   dx/dt = r'·cos θ − r·sin θ·θ'
 *   dy/dt = height
 *   dz/dt = r'·sin θ + r·cos θ·θ'
 */
function curlPath({ swirl, height, turns, segments }: CurlOptions): PathPoint[] {
  const path: PathPoint[] = [];

  const dTheta = turns * Math.PI * 2; // θ'(t)
  const dR = swirl; //                   r'(t) — the curl widens linearly as it rises

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = dTheta * t;
    const r = swirl * t;

    path.push({
      position: new Vector3(r * Math.cos(theta), height * t, r * Math.sin(theta)),
      tangent: new Vector3(
        dR * Math.cos(theta) - r * Math.sin(theta) * dTheta,
        height,
        dR * Math.sin(theta) + r * Math.cos(theta) * dTheta,
      ),
    });
  }

  return path;
}

function buildCurl(options: CurlOptions) {
  const { radius, taper, sides } = options;

  return sweep(circleProfile(radius, sides), transportFrames(curlPath(options)), {
    // Ease the taper rather than running it linearly — smoke thins slowly, then vanishes fast.
    scale: (t) => 1 - (1 - taper) * t * t,
    cap: false, // the root emerges from something; the tip is already a point
  });
}

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container, { frustumSize: 3, background: 0x1e2430 });

  const params: CurlOptions = {
    swirl: 0.7,
    height: 3,
    turns: 1.25,
    radius: 0.22,
    taper: 0.04,
    segments: 80,
    sides: 8,
  };

  const material = new MeshStandardMaterial({
    color: "#cfd8e3",
    roughness: 1,
    flatShading: true,
    side: DoubleSide,
    transparent: true,
    opacity: 0.85,
  });

  let curl = new Mesh(buildCurl(params), material);
  scene.add(curl);
  scene.add(new AxesHelper(1));

  const rebuild = () => {
    curl.geometry.dispose();
    scene.remove(curl);
    curl = new Mesh(buildCurl(params), material);
    scene.add(curl);
  };

  const gui = new GUI();
  gui.add(params, "swirl", 0, 2, 0.05).name("Swirl").onChange(rebuild);
  gui.add(params, "height", 0.5, 6, 0.1).name("Height").onChange(rebuild);
  gui.add(params, "turns", 0, 4, 0.05).name("Turns").onChange(rebuild);
  gui.add(params, "segments", 8, 200, 1).name("Segments").onChange(rebuild);

  const section = gui.addFolder("Section");
  section.add(params, "radius", 0.02, 0.6, 0.01).name("Root Radius").onChange(rebuild);
  // Drive this to 0.01 and the trail dissolves to a point — the thing Three's sweep cannot do.
  section.add(params, "taper", 0.01, 1, 0.01).name("Taper").onChange(rebuild);
  // 4 = a hard-edged ribbon. 16 = a round wisp. The low-poly knob, on the cross-section.
  section.add(params, "sides", 3, 24, 1).name("Sides").onChange(rebuild);

  return () => {
    gui.destroy();
    curl.geometry.dispose();
    material.dispose();
    dispose();
  };
}
