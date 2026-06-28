import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  SphereGeometry,
  TorusGeometry,
} from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OrbitControls as OrbitControlsImpl } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { CameraTransition, type EasingFunction } from "three-low-poly";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Camera Transition" };

export default function (container: HTMLElement) {
  const { scene, renderer, dispose: disposeScene } = createScene(container, {
    background: 0x1a1a2e,
  });
  clearDefaultLights(scene);

  const aspect = container.clientWidth / container.clientHeight || 1;
  const perspectiveCamera = new PerspectiveCamera(75, aspect, 0.1, 1000);
  perspectiveCamera.position.set(10, 10, 10);
  perspectiveCamera.lookAt(0, 0, 0);

  const distance = Math.sqrt(10 * 10 + 10 * 10 + 10 * 10);
  const vFOV = (perspectiveCamera.fov * Math.PI) / 180;
  const frustumSize = 2 * Math.tan(vFOV / 2) * distance;

  const orthographicCamera = new OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000,
  );
  orthographicCamera.position.set(10, 10, 10);
  orthographicCamera.lookAt(0, 0, 0);

  const cameraTransition = new CameraTransition(perspectiveCamera, orthographicCamera, renderer);
  let controls: OrbitControls = new OrbitControlsImpl(perspectiveCamera, renderer.domElement);
  controls.enableDamping = true;

  const ambientLight = new AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  scene.add(new GridHelper(20, 20, 0x444444, 0x222222));
  scene.add(new AxesHelper(5));

  const shapes: Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const cube = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ color: new Color().setHSL(i / 5, 0.8, 0.5) }),
    );
    cube.position.set(i * 2 - 4, 0.5, -3);
    cube.castShadow = cube.receiveShadow = true;
    scene.add(cube);
    shapes.push(cube);
  }
  for (let i = 0; i < 5; i++) {
    const sphere = new Mesh(
      new SphereGeometry(0.75, 32, 32),
      new MeshStandardMaterial({ color: new Color().setHSL(i / 5, 0.8, 0.6) }),
    );
    sphere.position.set(i * 2 - 4, 0.75, 0);
    sphere.castShadow = sphere.receiveShadow = true;
    scene.add(sphere);
    shapes.push(sphere);
  }
  for (let i = 0; i < 5; i++) {
    const cone = new Mesh(
      new ConeGeometry(0.75, 2, 32),
      new MeshStandardMaterial({ color: new Color().setHSL(i / 5, 0.8, 0.7) }),
    );
    cone.position.set(i * 2 - 4, 1, 3);
    cone.castShadow = cone.receiveShadow = true;
    scene.add(cone);
    shapes.push(cone);
  }

  const torus = new Mesh(new TorusGeometry(2, 0.5, 16, 32), new MeshStandardMaterial({ color: 0xff00ff }));
  torus.position.set(0, 3, 0);
  torus.rotation.x = Math.PI / 4;
  torus.castShadow = torus.receiveShadow = true;
  scene.add(torus);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    const nextAspect = w / h;
    perspectiveCamera.aspect = nextAspect;
    perspectiveCamera.updateProjectionMatrix();
    orthographicCamera.left = (frustumSize * nextAspect) / -2;
    orthographicCamera.right = (frustumSize * nextAspect) / 2;
    orthographicCamera.top = frustumSize / 2;
    orthographicCamera.bottom = frustumSize / -2;
    orthographicCamera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    cameraTransition.setSize(w, h);
  };
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(container);

  renderer.setAnimationLoop(() => {
    shapes.forEach((shape, index) => {
      shape.rotation.y += 0.01 * (index % 2 === 0 ? 1 : -1);
    });
    torus.rotation.y += 0.005;
    torus.rotation.z += 0.003;

    const currentCamera = cameraTransition.update(scene);
    if (controls.object !== currentCamera && !cameraTransition.getIsTransitioning()) {
      controls.dispose();
      controls = new OrbitControlsImpl(currentCamera, renderer.domElement);
      controls.enableDamping = true;
    }
    controls.update();
    cameraTransition.render(scene);
  });

  const transitionSettings = {
    currentCamera: "Perspective",
    duration: 1000,
    easing: "cubicInOut" as EasingFunction | "cubicInOut",
    progress: 0,
    transitionToPerspective: () => {
      cameraTransition.transitionTo(perspectiveCamera, {
        duration: transitionSettings.duration,
        easing: transitionSettings.easing,
        onUpdate: (progress) => progressController.setValue(progress),
        onComplete: () => {
          transitionSettings.currentCamera = "Perspective";
          cameraController.setValue("Perspective");
        },
      });
    },
    transitionToOrthographic: () => {
      cameraTransition.transitionTo(orthographicCamera, {
        duration: transitionSettings.duration,
        easing: transitionSettings.easing,
        onUpdate: (progress) => progressController.setValue(progress),
        onComplete: () => {
          transitionSettings.currentCamera = "Orthographic";
          cameraController.setValue("Orthographic");
        },
      });
    },
  };

  const gui = new GUI();
  const cameraFolder = gui.addFolder("Camera Transition");
  const cameraController = cameraFolder
    .add(transitionSettings, "currentCamera", ["Perspective", "Orthographic"])
    .name("Camera Type")
    .onChange((value: string) => {
      if (value === "Perspective") transitionSettings.transitionToPerspective();
      else transitionSettings.transitionToOrthographic();
    });
  cameraFolder.add(transitionSettings, "duration", 100, 3000, 100).name("Duration (ms)");
  cameraFolder
    .add(transitionSettings, "easing", [
      "linear",
      "quadIn",
      "quadOut",
      "quadInOut",
      "cubicIn",
      "cubicOut",
      "cubicInOut",
      "quartInOut",
    ])
    .name("Easing");
  const progressController = cameraFolder.add(transitionSettings, "progress", 0, 1).name("Progress").listen();
  progressController.disable();
  cameraFolder.open();

  const buttonsFolder = gui.addFolder("Quick Actions");
  buttonsFolder.add(transitionSettings, "transitionToPerspective").name("→ Perspective");
  buttonsFolder.add(transitionSettings, "transitionToOrthographic").name("→ Orthographic");
  buttonsFolder.open();

  return () => {
    gui.destroy();
    sizeObserver.disconnect();
    controls.dispose();
    cameraTransition.dispose();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    disposeScene();
  };
}