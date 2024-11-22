import { BufferGeometry, DodecahedronGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export class RocksGeometry extends BufferGeometry {
  constructor() {
    super();

    const rocks: DodecahedronGeometry[] = [];

    for (let i = 0; i < 5; i++) {
      const rock = new DodecahedronGeometry(1, 0);
      rock.scale(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
      rock.rotateX(Math.random() * Math.PI);
      rock.rotateY(Math.random() * Math.PI);
      rock.rotateZ(Math.random() * Math.PI);
      rock.translate((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4);

      rocks.push(rock);
    }

    this.copy(mergeBufferGeometries(rocks) as BufferGeometry);
  }
}
