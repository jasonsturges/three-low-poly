import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, SphereGeometry } from "three";

class Candle extends Group {
  private candle: Mesh;
  private flame: Mesh;
  private candleLight: PointLight;
  private height: number;
  private radius: number;

  constructor(height = 1, radius = 0.2) {
    super();
    this.height = height;
    this.radius = radius;

    // Candle Geometry
    const candleGeometry = new CylinderGeometry(this.radius, this.radius, this.height, 32);
    const candleMaterial = new MeshStandardMaterial({ color: 0xffffff });
    this.candle = new Mesh(candleGeometry, candleMaterial);
    this.candle.position.set(0, this.height / 2, 0);
    this.add(this.candle);

    // Flame Geometry
    const flameGeometry = new SphereGeometry(0.05, 16, 16);
    const flameMaterial = new MeshBasicMaterial({ color: 0xffa500 });
    this.flame = new Mesh(flameGeometry, flameMaterial);
    this.flame.position.set(0, this.height + 0.05, 0);
    this.add(this.flame);

    // Candlelight
    this.candleLight = new PointLight(0xffa500, 1, 5);
    this.candleLight.position.set(0, this.height + 0.05, 0);
    this.candleLight.castShadow = true;
    this.add(this.candleLight);

    this.animateFlicker();
  }

  animateFlicker() {
    const flicker = () => {
      // Random flicker intensity between 0.8 and 1.2
      this.candleLight.intensity = 1 + (Math.random() * 0.4 - 0.2);

      // Optional: slight random movement to simulate a flickering flame
      this.candleLight.position.x = Math.random() * 0.02 - 0.01;
      this.candleLight.position.z = Math.random() * 0.02 - 0.01;

      requestAnimationFrame(flicker);
    };
    flicker();
  }
}

export { Candle };
