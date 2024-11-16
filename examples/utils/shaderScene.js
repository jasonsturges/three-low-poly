import * as THREE from "three";

export function createShaderScene({ uniforms, vertexShader, fragmentShader } = {}) {
  const scene = new THREE.Scene();

  // Create the camera
  const camera = new THREE.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    0,
    1, // Near and far clipping planes
  );

  // Create the renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Shader material
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });

  // Full-screen plane geometry
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const handlers = [];

  renderer.setAnimationLoop(() => {
    handlers.forEach((handler) => handler());
    renderer.render(scene, camera);
  });

  // Add event listener to handle resizing
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, handlers, material };
}
