import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from "three";
import { mergeBufferGeometries } from "three-stdlib";

/**
 * Mausoleum Geometry
 *
 * Group indices:
 * 0. Base
 * 1. Building
 * 2. Roof
 * 3. Arched entrance
 */
export class MausoleumGeometry extends BufferGeometry {
  constructor() {
    super();

    // Base of the Mausoleum
    const baseGeometry = new BoxGeometry(5, 1, 5);
    baseGeometry.translate(0, 0.5, 0);

    // Main Building Structure
    const buildingGeometry = new BoxGeometry(4, 3, 4);
    buildingGeometry.translate(0, 2.5, 0);

    // Pillars
    const pillarPositions = [
      [-1.8, 2.3, -2.2],
      [1.8, 2.3, -2.2],
      [-1.8, 2.3, 2.2],
      [1.8, 2.3, 2.2],
    ];

    const pillars: BufferGeometry[] = [];
    pillarPositions.forEach((position) => {
      const pillar = new CylinderGeometry(0.2, 0.2, 3.5, 16);
      pillar.translate(position[0], position[1], position[2]);
      pillars.push(pillar);
    });

    // Roof (Peaked)
    const roofGeometry = new ConeGeometry(3.5, 2, 4);
    roofGeometry.rotateY(Math.PI / 4);
    roofGeometry.translate(0, 5, 0);

    // Arched Entrance
    const archShape = new Shape();
    archShape.moveTo(-1, 0);
    archShape.lineTo(-1, 2);
    archShape.absarc(0, 2, 1, Math.PI, 0, true);
    archShape.lineTo(1, 0);

    const extrudeSettings = {
      depth: 0.5,
      bevelEnabled: false,
    };
    const archGeometry = new ExtrudeGeometry(archShape, extrudeSettings);
    archGeometry.translate(0, 0.5, 1.7);
    archGeometry.setIndex([...Array(archGeometry.attributes.position.count).keys()]);

    this.copy(
      mergeBufferGeometries(
        [
          baseGeometry,
          mergeBufferGeometries([buildingGeometry, ...pillars], false) as BufferGeometry,
          roofGeometry,
          archGeometry,
        ],
        true,
      ) as BufferGeometry,
    );
    this.computeVertexNormals();
  }
}
