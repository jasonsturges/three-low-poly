import { Shape } from "three";

export class HexagonShape extends Shape {
  constructor(radius = 1) {
    super();

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i; // 60-degree increments
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    this.closePath();
  }
}
