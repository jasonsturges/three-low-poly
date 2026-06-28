import {
  AmbientLight,
  ArrowHelper,
  AxesHelper,
  BoxGeometry,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
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
  const { scene, camera, controls, dispose } = createScene(container, {
    background: 0x1a1a1a,
    cameraPosition: [8, 6, 8],
  });
  clearDefaultLights(scene);
  controls.enableDamping = true;

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

  return () => {
    gui.destroy();
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