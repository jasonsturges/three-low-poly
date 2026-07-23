import {
  AmbientLight,
  ArrowHelper,
  AxesHelper,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  Euler,
  Float32BufferAttribute,
  GridHelper,
  Group,
  Line,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Spherical,
  SphereGeometry,
  Sprite,
  Vector3,
} from "three";
import GUI from "lil-gui";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";

export const meta = { title: "Coordinate System" };

export default function (container: HTMLElement) {
  const { scene, camera, controls, onFrame, dispose } = createScene(container, {
    background: 0x1a1a1a,
    cameraPosition: [8, 6, 8],
  });
  clearDefaultLights(scene);
  controls.enableDamping = true;
  // Softer than the gallery default (0.16) — this example is about watching the
  // angle readouts settle, and a longer glide makes the pitch/yaw coupling much
  // easier to follow. Scene-local, so the shared gallery feel is untouched.
  controls.dampingFactor = 0.05;

  const ambientLight = new AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const params = {
    showGrid: true,
    showAxes: true,
    showAxisLabels: true,
    showAxisArrows: true,
    showCoordinateMarkers: true,
    showOrientationDiagram: true,
    gridSize: 20,
    markerInterval: 2,
    axisLength: 10,
  };

  let gridHelper = new GridHelper(params.gridSize, params.gridSize, 0x444444, 0x222222);
  scene.add(gridHelper);

  const axesHelper = new AxesHelper(params.axisLength);
  scene.add(axesHelper);

  const arrowHelpers: ArrowHelper[] = [];
  const axisLabels: Sprite[] = [];

  function createAxisArrow(direction: Vector3, color: number, label: string, length = 10) {
    const arrow = new ArrowHelper(direction, new Vector3(0, 0, 0), length, color, 0.5, 0.3);
    scene.add(arrow);
    arrowHelpers.push(arrow);

    const labelSprite = createTextSprite(label, {
      size: 64,
      scale: 0.8,
      color: `#${color.toString(16).padStart(6, "0")}`,
      x: direction.x * (length + 0.8),
      y: direction.y * (length + 0.8),
      z: direction.z * (length + 0.8),
    });
    scene.add(labelSprite);
    axisLabels.push(labelSprite);

    const posLabel = createTextSprite(`+${label}`, {
      size: 48,
      scale: 0.5,
      color: `#${color.toString(16).padStart(6, "0")}`,
      x: direction.x * (length * 0.7),
      y: direction.y * (length * 0.7),
      z: direction.z * (length * 0.7),
    });
    scene.add(posLabel);
    axisLabels.push(posLabel);
  }

  createAxisArrow(new Vector3(1, 0, 0), 0xff0000, "X", params.axisLength);
  createAxisArrow(new Vector3(-1, 0, 0), 0x880000, "-X", params.axisLength);
  createAxisArrow(new Vector3(0, 1, 0), 0x00ff00, "Y", params.axisLength);
  createAxisArrow(new Vector3(0, -1, 0), 0x008800, "-Y", params.axisLength);
  createAxisArrow(new Vector3(0, 0, 1), 0x0000ff, "Z", params.axisLength);
  createAxisArrow(new Vector3(0, 0, -1), 0x000088, "-Z", params.axisLength);

  const originMarker = new Mesh(
    new SphereGeometry(0.2, 16, 16),
    new MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5 }),
  );
  scene.add(originMarker);

  const originLabel = createTextSprite("(0,0,0)", { size: 64, scale: 0.6, color: "#ffff00", x: 0, y: 0.7, z: 0 });
  scene.add(originLabel);
  axisLabels.push(originLabel);

  const coordinateMarkers: Mesh[] = [];
  const coordinateLabels: Sprite[] = [];
  const markerGeometry = new BoxGeometry(0.15, 0.15, 0.15);

  function createCoordinateMarkers() {
    coordinateMarkers.forEach((m) => scene.remove(m));
    coordinateLabels.forEach((l) => scene.remove(l));
    coordinateMarkers.length = 0;
    coordinateLabels.length = 0;

    const interval = params.markerInterval;
    for (let x = -params.axisLength; x <= params.axisLength; x += interval) {
      if (x === 0) continue;
      const marker = new Mesh(markerGeometry, new MeshStandardMaterial({ color: x > 0 ? 0xff0000 : 0x880000 }));
      marker.position.set(x, 0, 0);
      scene.add(marker);
      coordinateMarkers.push(marker);
      const label = createTextSprite(`${x}`, {
        size: 48,
        scale: 0.4,
        color: x > 0 ? "#ff0000" : "#880000",
        x,
        y: -0.6,
        z: 0,
      });
      scene.add(label);
      coordinateLabels.push(label);
    }

    for (let y = -params.axisLength; y <= params.axisLength; y += interval) {
      if (y === 0) continue;
      const marker = new Mesh(markerGeometry, new MeshStandardMaterial({ color: y > 0 ? 0x00ff00 : 0x008800 }));
      marker.position.set(0, y, 0);
      scene.add(marker);
      coordinateMarkers.push(marker);
      const label = createTextSprite(`${y}`, {
        size: 48,
        scale: 0.4,
        color: y > 0 ? "#00ff00" : "#008800",
        x: 0,
        y,
        z: -0.6,
      });
      scene.add(label);
      coordinateLabels.push(label);
    }

    for (let z = -params.axisLength; z <= params.axisLength; z += interval) {
      if (z === 0) continue;
      const marker = new Mesh(markerGeometry, new MeshStandardMaterial({ color: z > 0 ? 0x0000ff : 0x000088 }));
      marker.position.set(0, 0, z);
      scene.add(marker);
      coordinateMarkers.push(marker);
      const label = createTextSprite(`${z}`, {
        size: 48,
        scale: 0.4,
        color: z > 0 ? "#0000ff" : "#000088",
        x: 0.6,
        y: 0,
        z,
      });
      scene.add(label);
      coordinateLabels.push(label);
    }
  }

  createCoordinateMarkers();

  // --- Pitch / yaw ----------------------------------------------------------
  // Cartesian position and orientation are two readings of the same state. The
  // diagram below draws the right triangle that connects them: the camera's
  // ground projection sweeps YAW about +Y (measured from +Z, because Three.js
  // takes `theta = atan2(x, z)`), and the rise off that projection sweeps the
  // elevation whose negation is PITCH about the camera's local +X. Roll — the
  // third angle — stays pinned at 0 because OrbitControls re-levels the camera
  // against world up on every update, which is exactly why two angles are
  // enough to describe an orbit camera.
  const YAW_COLOR = 0xff00ff;
  const PITCH_COLOR = 0x00ffff;
  const ARC_SEGMENTS = 32;

  const orientationGroup = new Group();
  scene.add(orientationGroup);

  const diagramLines: Line[] = [];

  function createDiagramLine(color: number, pointCount: number) {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(pointCount * 3), 3));
    const line = new Line(geometry, new LineBasicMaterial({ color }));
    orientationGroup.add(line);
    diagramLines.push(line);
    return line;
  }

  const radiusLine = createDiagramLine(0xffffff, 2);
  const groundLine = createDiagramLine(0x888888, 2);
  const riseLine = createDiagramLine(0x888888, 2);
  const yawArc = createDiagramLine(YAW_COLOR, ARC_SEGMENTS + 1);
  const pitchArc = createDiagramLine(PITCH_COLOR, ARC_SEGMENTS + 1);

  const yawLabel = createTextSprite("yaw", { size: 48, scale: 0.5, color: "#ff00ff" });
  const pitchLabel = createTextSprite("pitch", { size: 48, scale: 0.5, color: "#00ffff" });
  orientationGroup.add(yawLabel, pitchLabel);

  function writePoint(line: Line, index: number, x: number, y: number, z: number) {
    const position = line.geometry.getAttribute("position") as BufferAttribute;
    position.setXYZ(index, x, y, z);
    position.needsUpdate = true;
  }

  const orientation = {
    yaw: 0,
    pitch: 0,
    distance: 0,
    roll: 0,
    azimuthal: 0,
    polar: 0,
    forward: "",
    quaternion: "",
    axis: "",
    angle: "",
  };

  const euler = new Euler(0, 0, 0, "YXZ");
  const spherical = new Spherical();
  const offset = new Vector3();
  const forward = new Vector3();

  /** Pull pitch/yaw out of the camera's quaternion — the honest source of truth. */
  function readOrientation(includeAngles: boolean) {
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    euler.setFromQuaternion(camera.quaternion, "YXZ");

    if (includeAngles) {
      orientation.yaw = MathUtils.radToDeg(euler.y);
      orientation.pitch = MathUtils.radToDeg(euler.x);
      orientation.roll = MathUtils.radToDeg(euler.z);
      orientation.distance = spherical.radius;
    }

    orientation.azimuthal = MathUtils.radToDeg(spherical.theta);
    orientation.polar = MathUtils.radToDeg(spherical.phi);

    camera.getWorldDirection(forward);
    orientation.forward = `${forward.x.toFixed(2)}, ${forward.y.toFixed(2)}, ${forward.z.toFixed(2)}`;

    const { x, y, z, w } = camera.quaternion;
    orientation.quaternion = `${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}, ${w.toFixed(3)}`;
    // A quaternion is one rotation about one axis; the axis-angle reading is the
    // part that makes it legible next to the two Euler dials above.
    const halfAngle = Math.acos(MathUtils.clamp(w, -1, 1));
    const sinHalf = Math.sin(halfAngle);
    orientation.angle = `${MathUtils.radToDeg(halfAngle * 2).toFixed(1)}°`;
    orientation.axis =
      sinHalf < 1e-6
        ? "0.00, 0.00, 0.00 (identity)"
        : `${(x / sinHalf).toFixed(2)}, ${(y / sinHalf).toFixed(2)}, ${(z / sinHalf).toFixed(2)}`;
  }

  /** Drive the camera from the GUI's pitch/yaw, the inverse of `readOrientation`. */
  function applyOrientation() {
    spherical.set(
      Math.max(orientation.distance, 0.001),
      MathUtils.degToRad(90 + orientation.pitch),
      MathUtils.degToRad(orientation.yaw),
    );
    camera.position.setFromSpherical(spherical).add(controls.target);
    controls.update();
  }

  /**
   * Roll is the odd one out: it has no effect on the camera's *position*, so
   * there is no orbit angle to drive. OrbitControls re-levels the camera against
   * `camera.up` on every update, which is exactly why roll normally reads 0 —
   * so the way to roll an orbit camera is to tilt that reference. Rotating `up`
   * about the view axis by −r yields a roll of exactly r, leaving pitch and yaw
   * untouched. OrbitControls caches its orbit axis from `up` at construction, so
   * this tilts the horizon without disturbing which axis the camera orbits.
   */
  function applyRoll() {
    camera.getWorldDirection(forward);
    camera.up.set(0, 1, 0);
    if (orientation.roll !== 0) {
      camera.up.applyAxisAngle(forward, MathUtils.degToRad(-orientation.roll));
      camera.lookAt(controls.target);
    }
  }

  function updateDiagram() {
    if (!params.showOrientationDiagram) return;

    const target = controls.target;
    const theta = spherical.theta;
    const elevation = Math.PI / 2 - spherical.phi;
    const arcRadius = Math.min(3, spherical.radius * 0.35);
    const groundX = target.x + offset.x;
    const groundZ = target.z + offset.z;

    writePoint(radiusLine, 0, target.x, target.y, target.z);
    writePoint(radiusLine, 1, camera.position.x, camera.position.y, camera.position.z);
    writePoint(groundLine, 0, target.x, target.y, target.z);
    writePoint(groundLine, 1, groundX, target.y, groundZ);
    writePoint(riseLine, 0, groundX, target.y, groundZ);
    writePoint(riseLine, 1, camera.position.x, camera.position.y, camera.position.z);

    // Yaw sweeps in the ground plane, starting at +Z where theta is zero.
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const a = (theta * i) / ARC_SEGMENTS;
      writePoint(yawArc, i, target.x + Math.sin(a) * arcRadius, target.y, target.z + Math.cos(a) * arcRadius);
    }

    // Pitch sweeps in the vertical plane that contains the camera, lifting off
    // that same ground projection.
    const ux = Math.sin(theta);
    const uz = Math.cos(theta);
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const a = (elevation * i) / ARC_SEGMENTS;
      const horizontal = Math.cos(a) * arcRadius;
      writePoint(
        pitchArc,
        i,
        target.x + ux * horizontal,
        target.y + Math.sin(a) * arcRadius,
        target.z + uz * horizontal,
      );
    }

    const yawMid = theta / 2;
    yawLabel.position.set(
      target.x + Math.sin(yawMid) * arcRadius * 1.2,
      target.y + 0.3,
      target.z + Math.cos(yawMid) * arcRadius * 1.2,
    );

    const pitchMid = elevation / 2;
    const pitchHorizontal = Math.cos(pitchMid) * arcRadius * 1.2;
    pitchLabel.position.set(
      target.x + ux * pitchHorizontal,
      target.y + Math.sin(pitchMid) * arcRadius * 1.2,
      target.z + uz * pitchHorizontal,
    );
  }

  // While a GUI slider is being dragged the camera is downstream of the panel,
  // so suspend the readback that would otherwise fight the drag.
  let editing = false;

  const unsubscribe = onFrame(() => {
    applyRoll();
    readOrientation(!editing);
    updateDiagram();
  });

  const gui = new GUI();
  gui.title("Coordinate System");
  gui.add(params, "showGrid").name("Show Grid").onChange((v: boolean) => {
    gridHelper.visible = v;
  });
  gui.add(params, "showAxes").name("Show Axes Helper").onChange((v: boolean) => {
    axesHelper.visible = v;
  });
  gui.add(params, "showAxisLabels").name("Show Axis Labels").onChange((v: boolean) => {
    axisLabels.forEach((label) => {
      label.visible = v;
    });
  });
  gui.add(params, "showAxisArrows").name("Show Axis Arrows").onChange((v: boolean) => {
    arrowHelpers.forEach((arrow) => {
      arrow.visible = v;
    });
  });
  gui.add(params, "showCoordinateMarkers").name("Show Coordinate Markers").onChange((v: boolean) => {
    coordinateMarkers.forEach((marker) => {
      marker.visible = v;
    });
    coordinateLabels.forEach((label) => {
      label.visible = v;
    });
  });
  gui.add(params, "showOrientationDiagram").name("Show Pitch/Yaw Diagram").onChange((v: boolean) => {
    orientationGroup.visible = v;
    if (v) updateDiagram();
  });
  gui.add(params, "gridSize", 10, 50, 1).name("Grid Size").onChange((v: number) => {
    scene.remove(gridHelper);
    gridHelper = new GridHelper(v, v, 0x444444, 0x222222);
    gridHelper.visible = params.showGrid;
    scene.add(gridHelper);
  });
  gui.add(params, "markerInterval", 1, 5, 1).name("Marker Interval").onChange(createCoordinateMarkers);
  gui.add(params, "axisLength", 5, 20, 1).name("Axis Length").onChange(createCoordinateMarkers);

  const infoFolder = gui.addFolder("Coordinate System Info");
  infoFolder.close();
  const info = {
    xAxis: "Red: Left (-) to Right (+)",
    yAxis: "Green: Down (-) to Up (+)",
    zAxis: "Blue: Back (-) to Forward (+)",
    origin: "Yellow sphere at (0,0,0)",
    rightHand: "Three.js uses right-hand coordinate system",
  };
  infoFolder.add(info, "xAxis").name("X-Axis").disable();
  infoFolder.add(info, "yAxis").name("Y-Axis").disable();
  infoFolder.add(info, "zAxis").name("Z-Axis").disable();
  infoFolder.add(info, "origin").name("Origin").disable();
  infoFolder.add(info, "rightHand").name("System").disable();

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.add(camera.position, "x", -50, 50).name("X").listen();
  cameraFolder.add(camera.position, "y", -50, 50).name("Y").listen();
  cameraFolder.add(camera.position, "z", -50, 50).name("Z").listen();

  // Editable, so the panel drives the camera as well as reporting on it — drag
  // yaw and watch X/Z above trade off; drag pitch and watch Y climb.
  const orientationFolder = gui.addFolder("Camera Orientation");
  const editable = (controller: ReturnType<typeof orientationFolder.add>) =>
    controller
      .onChange(() => {
        editing = true;
        applyOrientation();
      })
      .onFinishChange(() => {
        editing = false;
      })
      .listen();

  editable(orientationFolder.add(orientation, "yaw", -180, 180, 0.1).name("Yaw ° (about +Y)"));
  editable(orientationFolder.add(orientation, "pitch", -89.9, 89.9, 0.1).name("Pitch ° (about local +X)"));
  editable(orientationFolder.add(orientation, "distance", 0.5, 60, 0.1).name("Distance"));
  editable(orientationFolder.add(orientation, "roll", -180, 180, 0.1).name("Roll ° (about view axis)"));
  orientationFolder.add({ level: () => { orientation.roll = 0; } }, "level").name("Level Horizon (roll = 0)");
  orientationFolder.add(orientation, "forward").name("Forward Vector").disable().listen();

  const anglesInfo = {
    yaw: "0° looks toward −Z; +90° looks toward −X",
    pitch: "Negative looks down, positive looks up",
    roll: "Tilts camera.up; orbiting does not change it",
    order: "Applied Y then X then Z (Euler order 'YXZ')",
  };
  const anglesFolder = orientationFolder.addFolder("What The Angles Mean");
  anglesFolder.close();
  anglesFolder.add(anglesInfo, "yaw").name("Yaw").disable();
  anglesFolder.add(anglesInfo, "pitch").name("Pitch").disable();
  anglesFolder.add(anglesInfo, "roll").name("Roll").disable();
  anglesFolder.add(anglesInfo, "order").name("Order").disable();

  // The same orientation in the two other representations Three.js hands you.
  const quaternionFolder = gui.addFolder("Quaternion & Orbit Angles");
  quaternionFolder.close();
  quaternionFolder.add(orientation, "quaternion").name("Quaternion x,y,z,w").disable().listen();
  quaternionFolder.add(orientation, "axis").name("Rotation Axis").disable().listen();
  quaternionFolder.add(orientation, "angle").name("Rotation Angle").disable().listen();
  quaternionFolder.add(orientation, "azimuthal", -180, 180).name("Azimuthal ° (= yaw)").disable().listen();
  quaternionFolder.add(orientation, "polar", 0, 180).name("Polar ° (= 90 + pitch)").disable().listen();

  return () => {
    unsubscribe();
    gui.destroy();
    diagramLines.forEach((line) => {
      line.geometry.dispose();
      (line.material as LineBasicMaterial).dispose();
    });
    markerGeometry.dispose();
    originMarker.geometry.dispose();
    (originMarker.material as MeshStandardMaterial).dispose();
    scene.traverse((object) => {
      if (object instanceof Mesh && object !== originMarker) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
      if (object instanceof Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
      if (object instanceof ArrowHelper) {
        object.dispose();
      }
    });
    axesHelper.dispose();
    dispose();
  };
}
