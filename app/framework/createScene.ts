import {
  AmbientLight,
  Clock,
  Color,
  ColorRepresentation,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface SceneOptions {
  /** Scene background color. Left transparent/black if omitted. */
  background?: ColorRepresentation;
  /** Initial camera position. Defaults to `[0, 0, 5]`. */
  cameraPosition?: [number, number, number];
  /**
   * Native MSAA. This is a WebGL context-creation attribute and is immutable
   * after the renderer exists, so toggling it means disposing this scene and
   * building a fresh one (see the antialiasing example). Defaults to `true`.
   */
  antialias?: boolean;
}

export interface SceneHandle {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  /** Register a per-frame callback; returns an unsubscribe function. */
  onFrame(handler: (delta: number) => void): () => void;
  /** Stop the loop and release the renderer, controls, and resize observer. */
  dispose(): void;
}

/**
 * Thin scene harness — the TypeScript successor to the old `createOrbitScene`
 * util. It owns the boilerplate that carries no per-example value (renderer,
 * camera, three-light rig, OrbitControls, the render loop, and resize) and
 * sizes itself to its container rather than the window, so it drops straight
 * into the gallery's viewer panel. Examples keep ownership of their own
 * objects, GUI, and disposal.
 *
 * Renderer-agnostic on purpose: when the WebGPU pass lands, this is the single
 * seam to swap `WebGLRenderer` for `WebGPURenderer`.
 */
export function createScene(container: HTMLElement, options: SceneOptions = {}): SceneHandle {
  const scene = new Scene();
  if (options.background !== undefined) scene.background = new Color(options.background);

  const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
  const [cx, cy, cz] = options.cameraPosition ?? [0, 0, 5];
  camera.position.set(cx, cy, cz);

  const renderer = new WebGLRenderer({ antialias: options.antialias ?? true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000);
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const ambient = new AmbientLight(0x404040, 0.5);
  scene.add(ambient);
  const directional = new DirectionalLight(0xffffff, 0.5);
  directional.position.set(-5, 10, 5);
  directional.castShadow = true;
  scene.add(directional);
  const hemisphere = new HemisphereLight(0xaaaaaa, 0x000000, 0.5);
  hemisphere.position.set(0, 10, 0);
  scene.add(hemisphere);

  const controls = new OrbitControls(camera, canvas);

  const handlers = new Set<(delta: number) => void>();

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
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
