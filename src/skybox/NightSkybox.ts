import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { nightSkyShader, NightSkyUniforms } from "../shaders/nightSkyShader";

class NightSkybox extends Mesh {
  geometry: SphereGeometry;
  material: ShaderMaterial & { uniforms: NightSkyUniforms };

  constructor(size = 1000) {
    super();

    this.geometry = new SphereGeometry(size, 32, 15);

    this.material = new ShaderMaterial({
      vertexShader: nightSkyShader.vertexShader,
      fragmentShader: nightSkyShader.fragmentShader,
      uniforms: nightSkyShader.uniforms,
      side: BackSide,
    }) as ShaderMaterial & { uniforms: NightSkyUniforms };
  }
}

export { NightSkybox };
