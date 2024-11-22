import { BufferGeometry, DodecahedronGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

/**
 * Group indices:
 * 0. Rocks
 * 1. Moss
 */
export class MossyRocksGeometry extends BufferGeometry {
  constructor() {
    super();

    const rocks: DodecahedronGeometry[] = [];
    const mosses: DodecahedronGeometry[] = [];

    for (let i = 0; i < 5; i++) {
      const scaleX = 0.8 + Math.random() * 0.4;
      const scaleY = 0.8 + Math.random() * 0.4;
      const scaleZ = 0.8 + Math.random() * 0.4;
      const rotationX = Math.random() * Math.PI;
      const rotationY = Math.random() * Math.PI;
      const rotationZ = Math.random() * Math.PI;
      const positionX = (Math.random() - 0.5) * 4;
      const positionY = 0;
      const positionZ = (Math.random() - 0.5) * 4;

      const rock = new DodecahedronGeometry(1, 0);
      rock.scale(scaleX, scaleY, scaleZ);
      rock.rotateX(rotationX);
      rock.rotateY(rotationY);
      rock.rotateZ(rotationZ);
      rock.translate(positionX, positionY, positionZ);
      rocks.push(rock);

      const moss = new DodecahedronGeometry(1, 0);
      moss.scale(scaleX * 0.9, scaleY * 0.5, scaleZ * 0.9);
      moss.rotateX(rotationX);
      moss.rotateY(rotationY);
      moss.rotateZ(rotationZ);
      moss.translate(positionX, positionY + 0.3, positionZ);
      mosses.push(moss);
    }

    this.copy(
      mergeBufferGeometries([
        mergeBufferGeometries(rocks) as BufferGeometry,
        mergeBufferGeometries(mosses) as BufferGeometry,
      ], true) as BufferGeometry
    )
  }
}
