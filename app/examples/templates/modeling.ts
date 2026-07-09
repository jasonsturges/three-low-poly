import {
  AxesHelper,
  BufferAttribute,
  BufferGeometry,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  TextureLoader,
} from "three";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Modeling",
  description:
    "Hand-built BufferGeometry with positions, normals, UVs, and indices. " +
    "Shows the vertex layout pattern used across the library's procedural geometries.",
};

/** Teaching geometry — a single quad with explicit attributes (ported from the legacy template). */
class ModelingGeometry extends BufferGeometry {
  constructor() {
    super();

    const vertices = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    // Counter-clockwise: a,b,d  b,c,d
    const indices = [0, 1, 3, 1, 2, 3];
    const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
    const uvs = [0, 0, 1, 0, 1, 1, 0, 1];

    this.setAttribute("position", new BufferAttribute(new Float32Array(vertices), 3));
    this.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    this.setIndex(indices);
    this.addGroup(0, 6, 0);
  }
}

/** Contribution starter: custom geometry + helpers for debugging normals and axes. */
export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const geometry = new ModelingGeometry();
  const texture = new TextureLoader().load(`${import.meta.env.BASE_URL}uv-grid.jpg`);
  const material = new MeshStandardMaterial({ map: texture, side: FrontSide });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  const normalsHelper = new VertexNormalsHelper(mesh, 1, 0xff0000);
  scene.add(normalsHelper);

  const axesHelper = new AxesHelper(5);
  scene.add(axesHelper);

  return () => {
    texture.dispose();
    geometry.dispose();
    material.dispose();
    normalsHelper.dispose();
    axesHelper.dispose();
    dispose();
  };
}