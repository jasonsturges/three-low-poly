import {
  Clock,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  ShaderMaterialParameters,
  Uniform,
  Vector2,
  WebGLRenderer,
} from "three";
import { createWebGLRenderer } from "./createWebGLRenderer";

export interface ShaderSceneOptions {
  /** Passed through to ShaderMaterial. `uResolution` is added automatically when omitted. */
  uniforms?: ShaderMaterialParameters["uniforms"];
  vertexShader?: string;
  fragmentShader?: string;
  antialias?: boolean;
}

export interface ShaderSceneHandle {
  scene: Scene;
  camera: OrthographicCamera;
  renderer: WebGLRenderer;
  material: ShaderMaterial;
  mesh: Mesh;
  /** Pixel dimensions of the drawable area — matches `gl_FragCoord` space when passed to `uResolution`. */
  resolution: Vector2;
  onFrame(handler: (delta: number) => void): () => void;
  dispose(): void;
}

const DEFAULT_VERTEX_SHADER = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const DEFAULT_FRAGMENT_SHADER = `
  uniform vec2 uResolution;
  void main() {
    vec2 st = gl_FragCoord.xy / uResolution;
    gl_FragColor = vec4(st.x, st.y, abs(sin(st.x * 10.0)), 1.0);
  }
`;

/**
 * Full-viewport shader harness — successor to the legacy `createShaderScene` util.
 *
 * Renders a 2×2 plane through an orthographic camera so the fragment shader covers
 * the entire container. Sizes to its parent (the gallery viewer panel), keeps
 * `uResolution` in sync with the drawable pixel size, and runs a disposable
 * animation loop for SPA navigation.
 */
export function createShaderScene(
  container: HTMLElement,
  {
    uniforms,
    vertexShader = DEFAULT_VERTEX_SHADER,
    fragmentShader = DEFAULT_FRAGMENT_SHADER,
    antialias = true,
  }: ShaderSceneOptions = {},
): ShaderSceneHandle {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const renderer = createWebGLRenderer({ antialias });
  renderer.setPixelRatio(window.devicePixelRatio);
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const resolution = new Vector2(1, 1);
  const material = new ShaderMaterial({
    uniforms: {
      uResolution: { value: resolution },
      ...uniforms,
    },
    vertexShader,
    fragmentShader,
  });

  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  scene.add(mesh);

  const syncResolution = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const pr = renderer.getPixelRatio();
    resolution.set(w * pr, h * pr);
    const uniform = material.uniforms.uResolution as Uniform<Vector2> | undefined;
    if (uniform) uniform.value.copy(resolution);
  };

  const observer = new ResizeObserver(syncResolution);
  observer.observe(container);
  syncResolution();

  const handlers = new Set<(delta: number) => void>();
  const clock = new Clock();

  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    handlers.forEach((handler) => handler(delta));
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    material,
    mesh,
    resolution,
    onFrame(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
      handlers.clear();
    },
  };
}