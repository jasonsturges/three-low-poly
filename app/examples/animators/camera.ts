import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import GUI from "lil-gui";
import {
  CameraPlayback,
  createDollyClip,
  createFlythroughClip,
  createOrbitClip,
  createPendulumClip,
  createSpiralClip,
  createWobbleClip,
  createZoomClip,
  type CameraClip,
} from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Camera Animations",
  description:
    "Unity-style showcase playback — one director, dt-based clips, OrbitControls paused while playing. " +
    "Orbit, pendulum drift, waypoint tour, dolly, spiral, zoom, and impact wobble.",
};

const FOCUS = new Vector3(0, 0.5, 0);

const CLIP_NAMES = ["Orbit", "Pendulum", "Flythrough", "Dolly", "Spiral", "Zoom", "Wobble"] as const;
type ClipName = (typeof CLIP_NAMES)[number];

function buildClip(name: ClipName): CameraClip {
  switch (name) {
    case "Orbit":
      return createOrbitClip({ target: FOCUS, radius: 9, duration: 10, revolutions: 1 });
    case "Pendulum":
      return createPendulumClip({
        target: FOCUS,
        distance: 7,
        duration: 24,
        oscillations: 2,
        azimuthAmplitude: 0.12,
      });
    case "Flythrough":
      return createFlythroughClip({
        waypoints: [
          new Vector3(0, 2.5, 7),
          new Vector3(4, 3, 0),
          new Vector3(-5, 2.5, -4),
          new Vector3(0, 2, 5),
        ],
        duration: 12,
      });
    case "Dolly":
      return createDollyClip({ distance: -4, duration: 4 });
    case "Spiral":
      return createSpiralClip({
        target: new Vector3(0, 0, 0),
        radius: 7,
        endRadius: 11,
        height: 10,
        revolutions: 1,
        duration: 12,
      });
    case "Zoom":
      return createZoomClip({ target: FOCUS, endFov: 35, duration: 3 });
    case "Wobble":
      return createWobbleClip({ intensity: 0.35, duration: 0.8 });
  }
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, onFrame, dispose } = createScene(container, {
    cameraPosition: [0, 2.5, 7],
  });
  controls.target.copy(FOCUS);
  controls.update();

  const blueMaterial = new MeshStandardMaterial({ color: 0x0077ff });
  const blueCube = new Mesh(new BoxGeometry(1, 1, 1), blueMaterial);
  blueCube.position.set(0, 0.5, 0);
  blueCube.castShadow = true;
  scene.add(blueCube);

  const orangeMaterial = new MeshStandardMaterial({ color: 0xff7700 });
  const orangeCone = new Mesh(new ConeGeometry(0.5, 1.5, 16), orangeMaterial);
  orangeCone.position.set(-3, 0.75, -2.5);
  orangeCone.castShadow = true;
  scene.add(orangeCone);

  const yellowMaterial = new MeshStandardMaterial({ color: 0xffff00 });
  const yellowSphere = new Mesh(new SphereGeometry(0.5, 16, 16), yellowMaterial);
  yellowSphere.position.set(1.5, 0.5, 2);
  yellowSphere.castShadow = true;
  scene.add(yellowSphere);

  const greenMaterial = new MeshStandardMaterial({ color: 0x00ff00 });
  const greenCylinder = new Mesh(new CylinderGeometry(0.5, 0.5, 1, 16), greenMaterial);
  greenCylinder.position.set(3, 0.5, -4);
  greenCylinder.castShadow = true;
  scene.add(greenCylinder);

  const purpleMaterial = new MeshStandardMaterial({ color: 0x800080 });
  const purpleTorus = new Mesh(new TorusGeometry(0.5, 0.2, 16, 32), purpleMaterial);
  purpleTorus.position.set(-1.25, 0.2, 1.5);
  purpleTorus.rotation.x = Math.PI / 2;
  purpleTorus.castShadow = true;
  scene.add(purpleTorus);

  const planeGeometry = new PlaneGeometry(20, 20);
  const planeMaterial = new MeshStandardMaterial({ color: 0x808080, side: DoubleSide });
  const plane = new Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const playback = new CameraPlayback(camera, controls);
  playback.setRest();

  const params = { clip: "Orbit" as ClipName };

  onFrame((dt) => {
    playback.update(dt);
    controls.update();
  });

  const gui = new GUI();
  gui.title("Camera Playback");
  gui.add(params, "clip", CLIP_NAMES).name("Clip");
  gui
    .add(
      {
        Play: () => playback.play(buildClip(params.clip)),
      },
      "Play",
    )
    .name("▶ Play");
  gui.add({ Stop: () => playback.stop() }, "Stop").name("■ Stop");
  gui
    .add({
      Reset: () => {
        playback.reset();
        controls.target.copy(FOCUS);
        controls.update();
      },
    }, "Reset")
    .name("↺ Reset");

  return () => {
    gui.destroy();
    playback.dispose();
    blueCube.geometry.dispose();
    orangeCone.geometry.dispose();
    yellowSphere.geometry.dispose();
    greenCylinder.geometry.dispose();
    purpleTorus.geometry.dispose();
    planeGeometry.dispose();
    blueMaterial.dispose();
    orangeMaterial.dispose();
    yellowMaterial.dispose();
    greenMaterial.dispose();
    purpleMaterial.dispose();
    planeMaterial.dispose();
    dispose();
  };
}