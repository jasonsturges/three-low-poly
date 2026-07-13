import {
  AmbientLight,
  Clock,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  OrthographicCamera,
  Scene,
} from "three";
import { WebGPURenderer } from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { configureOrbitControls } from "./configureOrbitControls";
import { createWebGPURenderer } from "./createWebGPURenderer";

export interface OrthographicSceneOptions {
  /** Scene background color. Defaults to `0xeeeeee`. */
  background?: number;
  /** Orthographic frustum half-extent. Defaults to `10`. */
  frustumSize?: number;
  /** Initial camera position. Defaults to `[10, 10, 10]`. */
  cameraPosition?: [number, number, number];
  /** Whether to include a grid helper. Defaults to `true`. */
  grid?: boolean;
}

export interface OrthographicSceneHandle {
  scene: Scene;
  camera: OrthographicCamera;
  renderer: WebGPURenderer;
  controls: OrbitControls;
  onFrame(handler: (delta: number) => void): () => void;
  dispose(): void;
}

/**
 * Orthographic scene harness — successor to the legacy `createOrthographicScene`
 * util used by staircase examples. Sizes to its container rather than the window.
 */
export function createOrthographicScene(
  container: HTMLElement,
  options: OrthographicSceneOptions = {},
): OrthographicSceneHandle {
  const frustumSize = options.frustumSize ?? 10;
  const scene = new Scene();
  scene.background = new Color(options.background ?? 0xeeeeee);

  const renderer = createWebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const [cx, cy, cz] = options.cameraPosition ?? [10, 10, 10];
  camera.position.set(cx, cy, cz);
  camera.lookAt(0, 0, 0);

  if (options.grid !== false) {
    scene.add(new GridHelper(20, 20, 0x696969, 0xcccccc));
  }

  const directional = new DirectionalLight(0xffffff, 3);
  directional.position.set(5, 10, 5);
  directional.castShadow = true;
  // Configure the shadow camera — the Three.js default is a ±5 frustum with no depth bias, which
  // clips shadows on anything larger than a few units and leaves self-shadow acne (louvered slits
  // across flat receivers like a landing). A near/far of 0.5–500 spreads what little depth precision
  // a 512² map has across a range a thousand times deeper than the scene, which is what turns the
  // acne into stripes.
  directional.shadow.mapSize.set(2048, 2048);
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 50;
  directional.shadow.camera.left = -15;
  directional.shadow.camera.right = 15;
  directional.shadow.camera.top = 15;
  directional.shadow.camera.bottom = -15;
  directional.shadow.normalBias = 0.03;
  directional.shadow.bias = -0.0004;
  scene.add(directional);
  scene.add(new HemisphereLight(0xaaaaaa, 0x444444, 2));
  scene.add(new AmbientLight(0x404040, 2));

  const controls = new OrbitControls(camera, canvas);
  configureOrbitControls(controls);

  const handlers = new Set<(delta: number) => void>();

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    const aspect = w / h;
    camera.left = -frustumSize * aspect;
    camera.right = frustumSize * aspect;
    camera.top = frustumSize;
    camera.bottom = -frustumSize;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let disposed = false;
  const clock = new Clock();
  const renderFrame = () => {
    const delta = clock.getDelta();
    controls.update();
    handlers.forEach((handler) => handler(delta));
    renderer.render(scene, camera);
  };
  // WebGPU needs async device init before the first render; start the loop once
  // it resolves (and skip it if the scene was disposed while initializing).
  renderer.init().then(() => {
    if (!disposed) renderer.setAnimationLoop(renderFrame);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    onFrame(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      canvas.remove();
      handlers.clear();
    },
  };
}