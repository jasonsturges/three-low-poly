import { CatmullRomCurve3, Group, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from "three";

class SpiralTube extends Group {
  constructor() {
    super();

    const spiralLength = 100;
    const heightIncrement = 0.05;
    const curve = new CatmullRomCurve3(
      Array.from({ length: spiralLength }, (_, i) => {
        const angle = i * 0.2;
        return new Vector3(
          Math.cos(angle) * 0.4,
          i * heightIncrement,
          Math.sin(angle) * 0.4,
        );
      }),
    );

    const tubeGeometry = new TubeGeometry(curve, 200, 0.1, 8, false);
    const glassMaterial = new MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.2,
      emissive: 0x88ccff,
      emissiveIntensity: 0.2,
    });
    const multiSpiralTube = new Mesh(tubeGeometry, glassMaterial);
    this.add(multiSpiralTube);
  }
}

export { SpiralTube };