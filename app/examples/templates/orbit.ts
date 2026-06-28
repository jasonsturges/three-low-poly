import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const meta = {
  title: "Orbit",
  description:
    "Standard perspective scene with OrbitControls and a three-light rig. " +
    "Most library examples use createScene() which wraps this boilerplate.",
};

/** Contribution starter: the orbit-camera setup that createScene encapsulates. */
export default function (container: HTMLElement) {
  const scene = new Scene();

  const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000);
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: 0x00ff00 }));
  scene.add(mesh);

  scene.add(new AmbientLight(0x404040, 0.5));
  const directional = new DirectionalLight(0xffffff, 0.5);
  directional.position.set(-5, 10, 5);
  directional.castShadow = true;
  scene.add(directional);
  const hemisphere = new HemisphereLight(0xaaaaaa, 0x000000, 0.5);
  hemisphere.position.set(0, 10, 0);
  scene.add(hemisphere);

  const controls = new OrbitControls(camera, canvas);
  controls.update();

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    controls.dispose();
    mesh.geometry.dispose();
    (mesh.material as MeshStandardMaterial).dispose();
    renderer.dispose();
    canvas.remove();
  };
}