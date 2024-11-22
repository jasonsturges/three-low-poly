import { BackSide, BoxGeometry, Mesh, ShaderMaterial } from "three";
import { daySkyShader, DaySkyUniforms } from "../shaders/daySkyShader";

export class DaySkybox extends Mesh {
  geometry: BoxGeometry;
  material: ShaderMaterial & { uniforms: DaySkyUniforms };

  constructor(size = 1000) {
    super();

    this.geometry = new BoxGeometry(size, size, size);

    this.material = new ShaderMaterial({
      uniforms: daySkyShader.uniforms,
      vertexShader: daySkyShader.vertexShader,
      fragmentShader: daySkyShader.fragmentShader,
      side: BackSide,
    }) as ShaderMaterial & { uniforms: DaySkyUniforms };
  }
}
