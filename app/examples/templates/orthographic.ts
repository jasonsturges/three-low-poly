import {
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { configureOrbitControls } from "../../framework/configureOrbitControls";
import { createWebGPURenderer } from "../../framework/createWebGPURenderer";

export const meta = {
  title: "Orthographic",
  description:
    "Isometric-style orthographic camera with grid helper. " +
    "Use for architecture and technical previews; see also createOrthographicScene().",
};

/** Contribution starter: manual orthographic camera setup sized to the viewer. */
export default function (container: HTMLElement) {
  const frustumSize = 10;
  const scene = new Scene();
  scene.background = new Color(0xeeeeee);

  const renderer = createWebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  scene.add(new GridHelper(20, 20, 0x696969, 0xcccccc));

  const directional = new DirectionalLight(0xffffff, 1);
  directional.position.set(5, 10, 5);
  directional.castShadow = true;
  scene.add(directional);
  scene.add(new HemisphereLight(0xaaaaaa, 0x444444, 0.6));

  const cube = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0x0077ff }));
  cube.castShadow = true;
  scene.add(cube);

  const controls = new OrbitControls(camera, canvas);
  configureOrbitControls(controls);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
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

  // WebGPU needs async device init before the first render.
  let disposed = false;
  renderer.init().then(() => {
    if (disposed) return;
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
  });

  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    controls.dispose();
    cube.geometry.dispose();
    (cube.material as MeshStandardMaterial).dispose();
    renderer.dispose();
    canvas.remove();
  };
}