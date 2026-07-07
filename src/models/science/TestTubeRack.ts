import { BoxGeometry, Color, ColorRepresentation, DoubleSide, Group, Mesh, MeshStandardMaterial } from "three";
import { TestTubeGeometry } from "../../geometry/science/TestTubeGeometry";

export interface TestTubeRackOptions {
  /** Number of tubes. Defaults to `3`. */
  count?: number;
  /** Liquid color per tube; cycles when fewer entries than tubes. */
  colors?: ColorRepresentation[];
}

/**
 * Wooden rack with test tubes and emissive liquid fills.
 *
 * Glass shells use `DoubleSide` and `depthWrite: false`; liquid draws first
 * (`renderOrder` 1), glass second (`renderOrder` 2) so fills stay visible at
 * most camera angles.
 */
export class TestTubeRack extends Group {
  readonly count: number;

  constructor({
    count = 3,
    colors = ["#00ffaa", "#ff00aa", "#aa00ff"],
  }: TestTubeRackOptions = {}) {
    super();

    this.count = count;

    const rackGeometry = new BoxGeometry(3, 0.2, 1);
    const rackMaterial = new MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.3,
    });
    const rack = new Mesh(rackGeometry, rackMaterial);
    rack.position.y = 0.5;
    rack.castShadow = true;

    const testTubeGeometry = new TestTubeGeometry(0.1, 0.1, 1, 16);
    const glassMaterial = new MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.5,
      depthWrite: false,
      side: DoubleSide,
    });

    for (let i = 0; i < count; i++) {
      const testTube = new Mesh(testTubeGeometry, glassMaterial);
      const xPosition = (i - (count - 1) / 2) * 0.8;
      testTube.position.set(xPosition, 1, 0);
      testTube.castShadow = true;
      testTube.renderOrder = 2;

      const liquidGeometry = new TestTubeGeometry(0.099, 0.099, 0.5, 16, false);
      const liquidColor = colors[i % colors.length]!;
      const liquidMaterial = new MeshStandardMaterial({
        color: new Color(liquidColor),
        emissive: new Color(liquidColor),
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: DoubleSide,
      });

      const liquid = new Mesh(liquidGeometry, liquidMaterial);
      liquid.position.set(0, -0.25, 0);
      liquid.renderOrder = 1;
      testTube.add(liquid);

      rack.add(testTube);
    }

    this.add(rack);
  }
}