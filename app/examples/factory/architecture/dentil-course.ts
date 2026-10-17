import GUI from "lil-gui";
import {
  BoxGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector2,
  Vector3,
} from "three";
import { DentilCourseGeometry, type DentilSlack } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Dentil Course",
  description:
    "A dentil course round any plan — corners, inside corners and curves. A full tooth sits on each face of " +
    "every corner, and each run's slack is spread through its own gaps, never left at a corner. Seat Every " +
    "marks teeth where corbels would stand.",
};

/** Plans in (x, z). Any winding — `facing` decides the side. */
const PLANS: Record<string, [number, number][]> = {
  square: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  "L-plan": [[-1.2, -1], [1.2, -1], [1.2, 0.2], [0, 0.2], [0, 1], [-1.2, 1]],
  hexagon: Array.from({ length: 6 }, (_, k) => {
    const a = -Math.PI / 2 + (k / 6) * Math.PI * 2;
    return [1.2 * Math.cos(a), 1.2 * Math.sin(a)] as [number, number];
  }),
  bay: [
    [-1.2, -1],
    ...Array.from({ length: 17 }, (_, k) => {
      const a = Math.PI - (k / 16) * Math.PI;
      return [0.6 * Math.cos(a), -1 - 0.6 * Math.sin(a)] as [number, number];
    }),
    [1.2, -1],
    [1.2, 1],
    [-1.2, 1],
  ],
  round: Array.from({ length: 48 }, (_, k) => {
    const a = (k / 48) * Math.PI * 2;
    return [1.2 * Math.cos(a), 1.2 * Math.sin(a)] as [number, number];
  }),
};

export default function (container: HTMLElement) {
  const handle = createScene(container, {
    background: 0x1a1d24,
    // Level with the eaves: low enough to read the teeth's undersides, high enough to see round the plan.
    cameraPosition: [2.4, 0.6, -3.2],
  });
  const { scene, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.4);
  key.position.set(3, 2, -5);
  const fill = new DirectionalLight(0x8ea8cc, 0.45);
  fill.position.set(-4, -1, 2);
  scene.add(key, fill);

  const stone = new MeshStandardMaterial({ color: 0xece6da, roughness: 0.6, flatShading: true });
  const masonry = new MeshStandardMaterial({ color: 0x8a847a, roughness: 1, flatShading: true });
  const seatMaterial = new MeshStandardMaterial({ color: 0xc0583a, roughness: 0.6 });

  const params = {
    plan: "square",
    width: 0.05,
    gap: 0.035,
    height: 0.06,
    band: 0.015,
    projection: 0.045,
    slack: "gaps" as DentilSlack,
    cornerAngle: 20,
    seatEvery: 0,
    wall: true,
  };

  const stage = new Group();
  scene.add(stage);

  const clear = () => {
    for (const child of [...stage.children]) {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        stage.remove(child);
      }
    }
  };

  const rebuild = () => {
    clear();
    const plan = PLANS[params.plan]!;
    const eaves = 0.6;

    if (params.wall) {
      // The wall's outer face IS the course's wall line: extrude the plan up to the eaves.
      const shape = new Shape(plan.map(([x, z]) => new Vector2(x, -z)));
      const wall = new ExtrudeGeometry(shape, { depth: eaves + 0.1, bevelEnabled: false, curveSegments: 1 });
      wall.rotateX(-Math.PI / 2);
      wall.translate(0, -0.1, 0);
      stage.add(new Mesh(wall, masonry));
    }

    const dentils = new DentilCourseGeometry({
      points: plan.map(([x, z]) => new Vector3(x, eaves, z)),
      closed: true,
      facing: "outward",
      width: params.width,
      gap: params.gap,
      height: params.height,
      band: params.band,
      projection: params.projection,
      slack: params.slack,
      cornerAngle: (params.cornerAngle * Math.PI) / 180,
      seatEvery: params.seatEvery,
    });
    stage.add(new Mesh(dentils, stone));

    for (const seat of dentils.seats) {
      const marker = new Mesh(new BoxGeometry(0.02, 0.04, 0.02), seatMaterial);
      marker.position.copy(seat.position).y -= 0.03;
      stage.add(marker);
    }
  };
  rebuild();
  // FRAME ONCE, NEVER ON REBUILD — re-framing on a dial change throws away the viewer's zoom and pan.
  frameObject(handle, stage, { fit: 1.2 });

  const gui = new GUI();
  gui.title("Dentil Course");
  gui.add(params, "plan", Object.keys(PLANS)).name("Plan").onChange(rebuild);

  const teeth = gui.addFolder("Teeth");
  teeth.add(params, "width", 0.01, 0.2, 0.001).name("Width").onChange(rebuild);
  teeth.add(params, "gap", 0.005, 0.2, 0.001).name("Gap").onChange(rebuild);
  teeth.add(params, "height", 0.01, 0.2, 0.001).name("Height").onChange(rebuild);
  teeth.add(params, "band", 0.003, 0.08, 0.001).name("Band").onChange(rebuild);
  teeth.add(params, "projection", 0.005, 0.2, 0.001).name("Projection").onChange(rebuild);

  const layout = gui.addFolder("Layout");
  layout.add(params, "slack", ["gaps", "stretch"]).name("Slack Into").onChange(rebuild);
  layout.add(params, "cornerAngle", 1, 90, 1).name("Corner Angle°").onChange(rebuild);
  layout.add(params, "seatEvery", 0, 12, 1).name("Seat Every").onChange(rebuild);
  layout.add(params, "wall").name("Wall").onChange(rebuild);

  return () => {
    gui.destroy();
    clear();
    stone.dispose();
    masonry.dispose();
    seatMaterial.dispose();
    dispose();
  };
}
