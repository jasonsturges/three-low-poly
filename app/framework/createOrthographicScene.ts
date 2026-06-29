import {
  AmbientLight,
  Clock,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { configureOrbitControls } from "./configureOrbitControls";
import { createWebGLRenderer } from "./createWebGLRenderer";

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
  renderer: WebGLRenderer;
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

  const renderer = createWebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.localClippingEnabled = true;
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

  const clock = new Clock();
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    controls.update();
    handlers.forEach((handler) => handler(delta));
    renderer.render(scene, camera);
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
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      canvas.remove();
      handlers.clear();
    },
  };
}