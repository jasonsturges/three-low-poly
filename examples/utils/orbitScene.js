import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createOrbitScene() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(-5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.5);
  hemisphereLight.position.set(0, 10, 0);
  scene.add(hemisphereLight);

  const controls = new OrbitControls(camera, renderer.domElement);

  const handlers = [];

  renderer.setAnimationLoop(() => {
    handlers.forEach((handler) => handler());
    renderer.render(scene, camera);
    controls.update();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, handlers };
}
