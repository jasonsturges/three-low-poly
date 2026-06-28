import {
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PlaneGeometry,
  PointLight,
  SpotLight,
  Vector3,
} from "three";
import { Bookshelf, centerObject, logarithmicRandomMin, rowOfBooksByLength } from "three-low-poly";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Library" };

function hslToRgb(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function randomColor() {
  const h = Math.random() * 360;
  const s = logarithmicRandomMin(0.3, 0, 40);
  const l = logarithmicRandomMin(0.7, 0, 40);
  return hslToRgb(h, s, l);
}

export default function (container: HTMLElement) {
  const { scene, camera, controls, renderer, dispose } = createScene(container, {
    cameraPosition: [0, 5, 18],
  });
  clearDefaultLights(scene);
  renderer.shadowMap.type = PCFSoftShadowMap;
  controls.target.set(0, 5, 5);
  controls.update();

  const spotLight = new SpotLight(0xffffff, 2, 30, 1, 1, 0);
  spotLight.position.set(0, 20, 0);
  spotLight.target.position.set(0, 0, 0);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 4096;
  spotLight.shadow.mapSize.height = 4096;
  scene.add(spotLight);

  for (let i = 0; i < 3; i++) {
    const pointLight = new PointLight(0xffffff, 2, 100, 1);
    pointLight.castShadow = true;
    pointLight.position.set(0, 6, i * 10 - 10);
    scene.add(pointLight);
  }

  const warmLight = new PointLight(0xffb347, 5, 100, 1);
  warmLight.position.set(0, 6, 0);
  scene.add(warmLight);

  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (Math.PI / 2) * i;
    const x = 27 * Math.cos(angle);
    const y = 34 * Math.sin(angle);
    const color = i < 2 ? 0x5dade2 : 0xffb347;
    const pointLight = new PointLight(color, 5, 14, 1);
    pointLight.position.set(x, 6, y);
    scene.add(pointLight);
  }

  const coverMaterial = new MeshStandardMaterial({
    color: 0xff8888,
    metalness: 0.1,
    roughness: 0.7,
    flatShading: true,
  });
  const pagesMaterial = new MeshStandardMaterial({ color: 0xffffff, flatShading: true });

  coverMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      "attribute vec3 instanceColor;\nvarying vec3 vColor;\nvoid main() {",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvColor = instanceColor;",
    );
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", "varying vec3 vColor;\nvoid main() {");
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      "#include <dithering_fragment>\ngl_FragColor.rgb = vColor * gl_FragColor.rgb;",
    );
  };

  function makeBooks() {
    const books = rowOfBooksByLength({
      length: 9.6,
      coverMaterial,
      pagesMaterial,
      scaleXMin: 0.4,
      scaleXMax: 0.7,
      scaleYMin: 0.3,
      scaleYMax: 0.95,
      scaleZMin: 0.1,
      scaleZMax: 0.5,
    });
    const colors = new Float32Array(books.count * 3);
    for (let i = 0; i < books.count; i++) {
      const [r, g, b] = randomColor();
      colors[i * 3 + 0] = r / 255;
      colors[i * 3 + 1] = g / 255;
      colors[i * 3 + 2] = b / 255;
    }
    books.geometry.setAttribute("instanceColor", new InstancedBufferAttribute(colors, 3));
    return books;
  }

  function makeBookshelf() {
    const group = new Group();
    const bookshelf = new Bookshelf({ width: 5, height: 8, depth: 1, shelves: 4, open: true });
    bookshelf.castShadow = true;
    bookshelf.receiveShadow = true;
    group.add(bookshelf);

    for (let i = 0; i <= 4; i++) {
      const row = makeBooks();
      const shelfSpacing = (8 - 0.1) / (4 + 1);
      row.rotation.y = Math.PI / 2;
      row.position.set(-2.4, 0.1 / 2 + i * shelfSpacing, 0.5);
      row.castShadow = true;
      row.receiveShadow = true;
      group.add(row);
    }
    return group;
  }

  function makeBookshelves(count = 5, gap = 0) {
    const group = new Group();
    for (let i = 0; i < count; i++) {
      const bookshelf = makeBookshelf();
      bookshelf.position.x = i * (5 + gap);
      group.add(bookshelf);
    }
    return group;
  }

  const plane = new Mesh(new PlaneGeometry(40, 50), new MeshStandardMaterial({ color: 0x808080, emissive: 0x202020 }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const back = makeBookshelves(8, 0);
  centerObject(back, new Vector3(0, 4, -25.5));
  scene.add(back);

  const leftWall = makeBookshelves(10, 0);
  leftWall.rotation.y = Math.PI / 2;
  centerObject(leftWall, new Vector3(-20.5, 4, 0));
  scene.add(leftWall);

  const rightWall = makeBookshelves(10, 0);
  rightWall.rotation.y = -Math.PI / 2;
  centerObject(rightWall, new Vector3(20.5, 4, 0));
  scene.add(rightWall);

  const left = makeBookshelves(5, 0.25);
  left.rotation.y = Math.PI / 2;
  centerObject(left, new Vector3(-4, 4, 0));
  scene.add(left);

  const right = makeBookshelves(5, 0.25);
  right.rotation.y = -Math.PI / 2;
  centerObject(right, new Vector3(4, 4, 0));
  scene.add(right);

  return () => {
    coverMaterial.dispose();
    pagesMaterial.dispose();
    plane.geometry.dispose();
    plane.material.dispose();
    scene.traverse((object) => {
      if (object instanceof InstancedMesh || object instanceof Mesh) {
        if (object !== plane) {
          object.geometry?.dispose();
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material && material !== coverMaterial && material !== pagesMaterial) material.dispose();
        });
      }
    });
    dispose();
  };
}