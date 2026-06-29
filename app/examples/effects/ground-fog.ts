import { FogExp2, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import GUI from "lil-gui";
import { GroundFogEffect } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Ground Fog",
  description:
    "Drifting ground mist — interior scatter with toroidal wrap, plus optional perimeter " +
    "cards that soften visible terrain edges.",
};

const BG_COLOR = 0x05070c;
const FOG_COLOR = 0x080b12;

export default function (container: HTMLElement) {
  const { scene, onFrame, dispose } = createScene(container, {
    background: BG_COLOR,
    cameraPosition: [0, 6, 14],
  });

  scene.fog = new FogExp2(FOG_COLOR, 0.03);

  const ground = new Mesh(
    new PlaneGeometry(52, 52),
    new MeshStandardMaterial({ color: 0x1b211c, roughness: 1, flatShading: true }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const params = {
    count: 16,
    area: 16,
    perimeterCount: 20,
    plotHalf: 12,
    terrainHalf: 26,
    facingX: 0,
    facingZ: 1,
  };

  const buildFog = () =>
    new GroundFogEffect({
      count: params.count,
      area: params.area,
      perimeterCount: params.perimeterCount,
      plotHalf: params.plotHalf,
      terrainHalf: params.terrainHalf,
      cameraFacing: { x: params.facingX, z: params.facingZ },
    });

  let fog = buildFog();
  scene.add(fog);

  const rebuild = () => {
    scene.remove(fog);
    fog.dispose();
    fog = buildFog();
    scene.add(fog);
  };

  onFrame((dt) => fog.update(dt));

  const gui = new GUI();
  gui.title("Ground Fog");
  gui.add(params, "count", 0, 40, 1).name("Interior").onChange(rebuild);
  gui.add(params, "perimeterCount", 0, 40, 1).name("Perimeter").onChange(rebuild);
  gui.add(params, "area", 4, 30, 1).name("Area").onChange(rebuild);
  gui.add(params, "plotHalf", 4, 20, 0.5).name("Plot Half").onChange(rebuild);
  gui.add(params, "terrainHalf", 8, 30, 0.5).name("Terrain Half").onChange(rebuild);
  gui.add(params, "facingX", -1, 1, 0.1).name("Cam Face X").onChange(rebuild);
  gui.add(params, "facingZ", -1, 1, 0.1).name("Cam Face Z").onChange(rebuild);

  return () => {
    gui.destroy();
    fog.dispose();
    ground.geometry.dispose();
    (ground.material as MeshStandardMaterial).dispose();
    dispose();
  };
}