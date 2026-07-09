import {
  AxesHelper,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  TextureLoader,
} from "three";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";
import GUI from "lil-gui";
import { ParallelogramBoxGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = { title: "Parallelogram Box" };

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const textureLoader = new TextureLoader();
  const texture = textureLoader.load(`${import.meta.env.BASE_URL}uv-grid.jpg`);
  const material = new MeshStandardMaterial({ map: texture, side: FrontSide });

  const params = {
    width: 1,
    height: 2,
    depth: 0.5,
    skew: Math.PI / 4,
  };

  const mesh = new Mesh(new ParallelogramBoxGeometry(params.width, params.height, params.depth, params.skew), material);
  scene.add(mesh);

  const normalsHelper = new VertexNormalsHelper(mesh, 1, 0xff0000);
  scene.add(normalsHelper);

  const axesHelper = new AxesHelper(5);
  scene.add(axesHelper);

  const rebuild = () => {
    mesh.geometry.dispose();
    mesh.geometry = new ParallelogramBoxGeometry(params.width, params.height, params.depth, params.skew);
    normalsHelper.update();
  };

  const gui = new GUI();
  gui.title("Parallelogram Box");
  gui.add(params, "width", 0, 5, 0.01).name("Width").onChange(rebuild);
  gui.add(params, "height", 0, 5, 0.01).name("Height").onChange(rebuild);
  gui.add(params, "depth", 0, 5, 0.01).name("Depth").onChange(rebuild);
  gui.add(params, "skew", -Math.PI / 2, Math.PI / 2, 0.01).name("Skew").onChange(rebuild);

  return () => {
    gui.destroy();
    mesh.geometry.dispose();
    material.dispose();
    texture.dispose();
    normalsHelper.dispose();
    dispose();
  };
}