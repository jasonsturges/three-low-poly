import GUI from "lil-gui";
import { Color, CylinderGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, TorusGeometry } from "three";
import { GlowHalo } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Glow Halo",
  description:
    "Additive billboard glow — fake light with no PointLight, so hundreds cost no light budget. " +
    "Where the card intersects the hoop it gets sliced — that seam is inherent to representing glare " +
    "as a world-space quad. Keep Size modest relative to the fixture to limit it, and let a bloom " +
    "pass carry the wide spread.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, {
    background: 0x050508,
    cameraPosition: [0, 1.6, 7],
  });

  const params = {
    color: 0xffaa44,
    size: 1.2,
    opacity: 0.75,
    count: 12,
    showFixture: true,
  };

  const RING_RADIUS = 3.5;
  const WAX_HEIGHT = 0.35;
  const FLAME_Y = WAX_HEIGHT + 0.05;

  // The fixture that does the slicing — deliberately close to the flames, which is the whole
  // point. A halo several times taller than its candle cannot avoid intersecting its holder.
  const iron = new MeshStandardMaterial({ color: 0x2b2622, roughness: 0.8, flatShading: true });
  const hoopGeometry = new TorusGeometry(RING_RADIUS, 0.12, 6, 48);
  hoopGeometry.rotateX(Math.PI / 2);
  const hoop = new Mesh(hoopGeometry, iron);
  scene.add(hoop);

  const waxGeometry = new CylinderGeometry(0.09, 0.11, WAX_HEIGHT, 6);
  waxGeometry.translate(0, WAX_HEIGHT / 2, 0);
  // Faintly emissive, because a lit candle is luminous — the wax carries some of its own light rather
  // than relying on the halo. It also softens the silhouette the halo gets clipped against.
  const waxMaterial = new MeshStandardMaterial({
    color: 0xd9cdb2,
    emissive: new Color(params.color),
    emissiveIntensity: 0.25,
    roughness: 0.9,
    flatShading: true,
  });

  const halos: GlowHalo[] = [];
  const flames: Mesh[] = [];
  const wicks: Mesh[] = [];

  const clear = () => {
    for (const halo of halos) {
      scene.remove(halo);
      halo.dispose();
    }
    for (const flame of flames) {
      scene.remove(flame);
      (flame.material as MeshBasicMaterial).dispose();
      flame.geometry.dispose();
    }
    for (const wick of wicks) scene.remove(wick);
    halos.length = 0;
    flames.length = 0;
    wicks.length = 0;
  };

  const rebuild = () => {
    clear();

    for (let i = 0; i < params.count; i++) {
      const angle = (i / params.count) * Math.PI * 2;
      const x = Math.cos(angle) * RING_RADIUS;
      const z = Math.sin(angle) * RING_RADIUS;

      const wax = new Mesh(waxGeometry, waxMaterial);
      wax.position.set(x, 0, z);
      scene.add(wax);
      wicks.push(wax);

      const flame = new Mesh(
        new CylinderGeometry(0.002, 0.03, 0.12, 5),
        new MeshBasicMaterial({ color: params.color, toneMapped: false, fog: false }),
      );
      flame.position.set(x, FLAME_Y, z);
      scene.add(flame);
      flames.push(flame);

      const halo = new GlowHalo({
        color: params.color,
        size: params.size,
        opacity: params.opacity,
      });
      halo.position.set(x, FLAME_Y, z);
      scene.add(halo);
      halos.push(halo);
    }
  };

  rebuild();

  const sync = () => {
    for (const halo of halos) {
      halo.setColor(params.color);
      halo.setOpacity(params.opacity);
    }
    for (const flame of flames) (flame.material as MeshBasicMaterial).color.set(params.color);
    waxMaterial.emissive.set(params.color);
  };

  const gui = new GUI();
  gui.title("Glow Halo");
  // Additive clips at 1.0 per channel with no tone mapping, so a cluster of glows shows arcs and
  // hue shifts where each channel tops out. Screen compresses instead, and never clips.
  gui.addColor(params, "color").name("Color").onChange(sync);
  // Larger cards reach further into the hoop, so size and the artifact are directly linked.
  gui.add(params, "size", 0.2, 2.5, 0.05).name("Size").onChange(rebuild);
  gui.add(params, "opacity", 0, 1, 0.01).name("Opacity").onChange(sync);
  gui.add(params, "count", 4, 120, 1).name("Candles").onChange(rebuild);
  gui
    .add(params, "showFixture")
    .name("Fixture")
    .onChange((visible: boolean) => {
      hoop.visible = visible;
      for (const wick of wicks) wick.visible = visible;
    });

  return () => {
    gui.destroy();
    clear();
    hoopGeometry.dispose();
    waxGeometry.dispose();
    waxMaterial.dispose();
    iron.dispose();
    dispose();
  };
}
