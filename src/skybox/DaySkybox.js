import { BackSide, BoxGeometry, Mesh, ShaderMaterial } from "three";
import { daySkyShader } from "../shaders/daySkyShader.js";

class DaySkybox extends Mesh {
  constructor(size = 1000) {
    super();

    this.geometry = new BoxGeometry(size, size, size);

    this.material = new ShaderMaterial({
      vertexShader: daySkyShader.vertexShader,
      fragmentShader: daySkyShader.fragmentShader,
      side: BackSide,
    });
  }
}

export { DaySkybox };
