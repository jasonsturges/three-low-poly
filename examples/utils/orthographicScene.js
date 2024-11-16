import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export function createOrthographicScene() {
  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Orthographic Camera
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 10; // Adjust this for zoom level
  const camera = new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 100);
  camera.position.set(10, 10, 10); // Set position for isometric view
  camera.lookAt(0, 0, 0);

  // Grid Helper
  const gridHelper = new THREE.GridHelper(20, 20, 0x666666, 0xcccccc);
  scene.add(gridHelper);

  // Lighting
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const hemiLight = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 0.6);
  scene.add(hemiLight);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  const handlers = [];

  renderer.setAnimationLoop(() => {
    controls.update();
    handlers.forEach((handler) => handler());
    renderer.render(scene, camera);
  });

  // Resize Handling
  window.addEventListener("resize", () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -frustumSize * aspect;
    camera.right = frustumSize * aspect;
    camera.top = frustumSize;
    camera.bottom = -frustumSize;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, handlers };
}
