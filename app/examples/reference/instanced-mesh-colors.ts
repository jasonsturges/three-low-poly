import { BoxGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial } from "three";
import { randomInteger } from "three-low-poly";
import { createOrthographicScene } from "../../framework/createOrthographicScene";

export const meta = { title: "Instanced Mesh Colors" };

export default function (container: HTMLElement) {
  const { scene, camera, dispose } = createOrthographicScene(container);
  camera.zoom = 0.7;
  camera.updateProjectionMatrix();

  const count = 100;
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial();
  const instancedMesh = new InstancedMesh(geometry, material, count);

  const matrix = new Matrix4();
  for (let i = 0; i < count; i++) {
    matrix.setPosition(randomInteger(-10, 10), randomInteger(-10, 10), randomInteger(-10, 10));
    instancedMesh.setMatrixAt(i, matrix);
  }

  const colors = new Float32Array(instancedMesh.count * 3);
  for (let i = 0; i < instancedMesh.count; i++) {
    colors.set([Math.random(), Math.random(), Math.random()], i * 3);
  }
  instancedMesh.instanceColor = new InstancedBufferAttribute(colors, 3);
  scene.add(instancedMesh);

  return () => {
    geometry.dispose();
    material.dispose();
    dispose();
  };
}