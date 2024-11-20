import { Mesh, ShaderMaterial, SphereGeometry } from "three";
import { moonShader } from "../../shaders/moonShader";

export class Moon extends Mesh<SphereGeometry, ShaderMaterial> {
  constructor() {
    super(
      new SphereGeometry(5, 32, 32),
      new ShaderMaterial(moonShader),
    );
  }
}
