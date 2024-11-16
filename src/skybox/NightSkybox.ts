import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { nightSkyShader } from "../shaders/nightSkyShader";

class NightSkybox extends Mesh {
  geometry: SphereGeometry;
  material: ShaderMaterial;

  constructor(size = 1000) {
    super();

    this.geometry = new SphereGeometry(size, 32, 15);

    this.material = new ShaderMaterial({
      vertexShader: nightSkyShader.vertexShader,
      fragmentShader: nightSkyShader.fragmentShader,
      uniforms: nightSkyShader.uniforms,
      side: BackSide,
    });
  }
}

export { NightSkybox };
