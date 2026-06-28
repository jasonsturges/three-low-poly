import { Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, SphereGeometry, WebGLRenderer } from "three";

export const meta = {
  title: "Minimal",
  description:
    "Bare-minimum Three.js scene — no OrbitControls, no lights, no library imports. " +
    "Copy this when you want the smallest possible starting point.",
};

/**
 * Contribution starter: a single mesh and a render loop, sized to the gallery viewer.
 * Most examples use {@link createScene} instead; this template shows what that harness wraps.
 */
export default function (container: HTMLElement) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const geometry = new SphereGeometry(1, 32, 32);
  const material = new MeshBasicMaterial({ color: 0xff00ff });
  const sphere = new Mesh(geometry, material);
  scene.add(sphere);

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

  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  return () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    canvas.remove();
  };
}