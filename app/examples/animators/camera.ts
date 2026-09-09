import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  FrontSide,
  Box3,
  PCFSoftShadowMap,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import GUI from "lil-gui";
import {
  CameraPlayback,
  GroundGrid,
  createDollyClip,
  createCraneRevealClip,
  createImpactKickClip,
  createFovPulseClip,
  createFlythroughClip,
  createOrbitClip,
  createPendulumClip,
  createSpiralClip,
  createWobbleClip,
  createZoomClip,
  type CameraClip,
} from "three-low-poly";
import { gradientBackdrop } from "../../framework/gradientBackdrop";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Camera Animations",
  description:
    "Movement establishes a view; transitions carry it away; effects add temporary motion. " +
    "Play starts from the current view. Stop keeps it. Restore Example View explicitly returns home. " +
    "Trigger effects during movement to combine them. Speed scales both clocks; 0 freezes playback.",
};

const FOCUS = new Vector3(0, 0.5, 0);

const CLIP_NAMES = ["Orbit", "Pendulum", "Flythrough", "Dolly", "Spiral", "Zoom", "Wobble"] as const;
type ClipName = (typeof CLIP_NAMES)[number];

function buildClip(name: ClipName): CameraClip {
  switch (name) {
    case "Orbit":
      return createOrbitClip({ target: FOCUS, duration: 10, revolutions: 1 });
    case "Pendulum":
      return createPendulumClip({
        target: FOCUS,
        duration: 24,
        oscillations: 2,
        azimuthAmplitude: 0.12,
      });
    case "Flythrough":
      return createFlythroughClip({
        // Each destination has a corresponding subject to frame on arrival.
        waypoints: [new Vector3(4, 3, 0), new Vector3(-5, 2.5, -4), new Vector3(0, 2, 5)],
        lookAt: [FOCUS, new Vector3(-3, 0.75, -2.5), new Vector3(1.5, 0.5, 2)],
        duration: 12,
      });
    case "Dolly":
      return createDollyClip({ distance: -4, duration: 4 });
    case "Spiral":
      return createSpiralClip({
        target: FOCUS,
        endRadius: 12,
        height: 28,
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
  const { scene, camera, controls, renderer, onFrame, dispose } = createScene(container, {
    cameraPosition: [0, 2.5, 7],
    manualControls: true,
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

  const disposeBackdrop = gradientBackdrop(scene);
  const grid = new GroundGrid({ size: 24, planeColor: 0x0f141b });
  scene.add(grid);
  renderer.shadowMap.type = PCFSoftShadowMap;

  const subjects = [blueCube, orangeCone, yellowSphere, greenCylinder, purpleTorus];
  subjects.forEach((mesh) => {
    mesh.material.shadowSide = FrontSide;
    mesh.receiveShadow = true;
  });
  // Match the reference shadow scene: front-face depths and a fitted light frustum.
  const bounds = new Box3().setFromObject(grid);
  subjects.forEach((mesh) => bounds.expandByObject(mesh));
  const corners: Vector3[] = [];
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new Vector3(x, y, z));
  scene.traverse((light) => {
    if (!(light instanceof DirectionalLight) || !light.castShadow) return;
    light.intensity = 1.5;
    light.shadow.bias = -0.00001;
    light.shadow.normalBias = 0.05;
    light.updateMatrixWorld(true);
    light.target.updateMatrixWorld(true);
    light.shadow.updateMatrices(light);
    const fitted = new Box3().setFromPoints(corners.map((p) => p.clone().applyMatrix4(light.shadow.camera.matrixWorldInverse)));
    Object.assign(light.shadow.camera, {
      left: fitted.min.x - 1,
      right: fitted.max.x + 1,
      bottom: fitted.min.y - 1,
      top: fitted.max.y + 1,
      near: -fitted.max.z - 1,
      far: -fitted.min.z + 1,
    });
    light.shadow.camera.updateProjectionMatrix();
    light.shadow.updateMatrices(light);
  });

  const playback = new CameraPlayback(camera, controls);
  playback.setRest();

  // The host owns camera coordination. No controls.update() during playback.
  // Disable damping here so pending mouse inertia cannot resume after a clip.
  controls.enableDamping = false;
  onFrame((dt) => {
    if (!playback.isPlaying) controls.update();
    playback.update(dt);
  });

  const params = { movement: "Orbit", status: "Idle" };
  const gui = new GUI();
  gui.title("Camera Animators");
  const movement = gui.addFolder("Movement · keep final view");
  movement
    .add(params, "movement", ["Orbit", "Pendulum", "Flythrough", "Dolly In", "Dolly Out", "Zoom In", "Zoom Out"])
    .name("Movement");
  movement
    .add(
      {
        play() {
          const name = params.movement;
          if (name.startsWith("Dolly")) playback.play(createDollyClip({ distance: name === "Dolly In" ? -3 : 3, duration: 4 }));
          else if (name.startsWith("Zoom"))
            playback.play(
              createZoomClip({
                target: controls.target.clone(),
                endFov: Math.max(10, Math.min(110, camera.fov + (name === "Zoom In" ? -20 : 20))),
                duration: 3,
              }),
            );
          else playback.play(buildClip(name as ClipName));
        },
      },
      "play",
    )
    .name("Play from Current View");
  const transitions = gui.addFolder("Transition · reveal or depart");
  transitions.add({ play: () => playback.play(buildClip("Spiral")) }, "play").name("Spiral Fly Out");
  transitions
    .add({ play: () => playback.play(createCraneRevealClip({ target: FOCUS, height: 6, duration: 5 })) }, "play")
    .name("Crane Reveal");
  const effects = gui.addFolder("Effect · temporary offset");
  effects.add({ trigger: () => playback.play(buildClip("Wobble")) }, "trigger").name("Trigger Wobble");
  effects
    .add(
      {
        trigger: () => playback.play(createImpactKickClip({ direction: new Vector3(-1, 0.3, 0), intensity: 0.6, duration: 0.7 })),
      },
      "trigger",
    )
    .name("Impact Kick");
  effects
    .add({ trigger: () => playback.play(createFovPulseClip({ amplitude: 12, duration: 0.8 })) }, "trigger")
    .name("FOV Pulse");
  const transport = gui.addFolder("Playback & Example View");
  transport.add(playback, "timeScale", 0, 3, 0.1).name("Speed (×)");
  transport.add({ stop: () => playback.stop() }, "stop").name("Stop · Keep View");
  transport.add({ restore: () => playback.reset() }, "restore").name("Restore Example View");
  transport.add(params, "status").name("Status").listen().disable();
  onFrame(() => {
    params.status = playback.isMoving
      ? playback.isEffectPlaying
        ? "Movement + effect"
        : "Movement / transition"
      : playback.isEffectPlaying
        ? "Effect"
        : "Idle";
  });

  return () => {
    gui.destroy();
    playback.dispose();
    blueCube.geometry.dispose();
    orangeCone.geometry.dispose();
    yellowSphere.geometry.dispose();
    greenCylinder.geometry.dispose();
    purpleTorus.geometry.dispose();
    grid.dispose();
    disposeBackdrop();
    blueMaterial.dispose();
    orangeMaterial.dispose();
    yellowMaterial.dispose();
    greenMaterial.dispose();
    purpleMaterial.dispose();

    dispose();
  };
}
