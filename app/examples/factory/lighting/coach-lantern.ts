import GUI from "lil-gui";
import { AxesHelper, Color, DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { CoachLanternGeometry, type CoachLanternGeometryOptions } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Coach Lantern",
  description:
    "A BufferGeometry with three material groups — 0 iron, 1 glass, 2 wax — and the consumer owning the " +
    "materials. Origin is the hang point at the top of the bail, so the lantern hangs into −Y and `drop` " +
    "lengthens the rod without moving where it attaches. Colour edits mutate materials in place and never " +
    "rebuild geometry.",
};

export default function (container: HTMLElement) {
  const { scene, controls, dispose } = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [0.9, -0.5, 1.2],
  });
  controls.target.set(0, -0.6, 0);
  controls.update();

  // The origin is the hang point, so the lantern hangs below it — no ground grid, and axes at the
  // origin show exactly where a ceiling or bracket would attach.
  const axes = new AxesHelper(0.25);
  scene.add(axes);

  const geometryParams: Required<CoachLanternGeometryOptions> = {
    drop: 0.42,
    width: 0.15,
    height: 0.4,
    taper: 0.72,
    barWidth: 0.015,
    capHeight: 0.15,
    capSpread: 1.4,
    roofSpread: 1.05,
    roofThickness: 2,
    plateSpread: 1.15,
    plateThickness: 2,
    bail: true,
    bailRadius: 3,
    bailThickness: 0.8,
    bailSegments: 10,
    bailSides: 6,
    finial: true,
    candle: true,
    candleHeight: 0.5,
  };

  const colors = { iron: "#171a1f", glass: "#ffb45a", wax: "#d9cdb2" };

  const ironMaterial = new MeshStandardMaterial({
    color: new Color(colors.iron),
    metalness: 0.7,
    roughness: 0.5,
    flatShading: true,
  });
  // Lit from inside rather than reflecting — which is what an old lantern's glass actually does at night.
  const glassMaterial = new MeshStandardMaterial({
    color: new Color(colors.glass),
    emissive: new Color(colors.glass),
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.32,
    side: DoubleSide,
    depthWrite: false,
    roughness: 0.4,
  });
  // Faintly emissive: wax is translucent and glows when lit from within, so its flanks don't go black.
  const waxMaterial = new MeshStandardMaterial({
    color: new Color(colors.wax),
    emissive: new Color(colors.glass),
    emissiveIntensity: 0.35,
    roughness: 0.9,
    flatShading: true,
  });

  const lantern = new Mesh(new CoachLanternGeometry(geometryParams), [
    ironMaterial,
    glassMaterial,
    waxMaterial,
  ]);
  lantern.castShadow = true;
  scene.add(lantern);

  const rebuild = () => {
    lantern.geometry.dispose();
    lantern.geometry = new CoachLanternGeometry(geometryParams);
  };

  const gui = new GUI();
  gui.title("Coach Lantern Geometry");

  const cage = gui.addFolder("Cage");
  cage.add(geometryParams, "width", 0.05, 0.4, 0.005).name("Width").onChange(rebuild);
  cage.add(geometryParams, "height", 0.1, 1, 0.01).name("Height").onChange(rebuild);
  // 1 gives straight sides; lower rakes the posts inward, which is what reads as a coach lantern.
  cage.add(geometryParams, "taper", 0.4, 1, 0.01).name("Taper").onChange(rebuild);
  cage.add(geometryParams, "barWidth", 0.005, 0.05, 0.001).name("Bar Width").onChange(rebuild);
  cage.open();

  const mount = gui.addFolder("Mount");
  mount.add(geometryParams, "drop", 0.1, 2, 0.01).name("Drop").onChange(rebuild);
  mount.add(geometryParams, "bail").name("Bail Ring").onChange(rebuild);
  mount.add(geometryParams, "bailRadius", 1.5, 8, 0.1).name("Bail Radius").onChange(rebuild);
  mount.add(geometryParams, "bailThickness", 0.3, 2, 0.05).name("Bail Thickness").onChange(rebuild);
  // The bail is the ONLY round part here, so these two are the only segment counts that change anything.
  // The cap, collar, and plate are 4-sided because 4 is the square they are meant to be.
  mount.add(geometryParams, "bailSegments", 3, 24, 1).name("Bail Segments").onChange(rebuild);
  mount.add(geometryParams, "bailSides", 3, 12, 1).name("Bail Sides").onChange(rebuild);
  const roof = gui.addFolder("Roof");
  // The plate tracks `taper`, so it stays fitted to the cage top as you re-rake it.
  roof.add(geometryParams, "roofSpread", 0.6, 1.6, 0.01).name("Roof Spread").onChange(rebuild);
  roof.add(geometryParams, "roofThickness", 0.5, 5, 0.1).name("Roof Thickness").onChange(rebuild);
  roof.add(geometryParams, "capHeight", 0.02, 0.4, 0.005).name("Cap Height").onChange(rebuild);
  // 1 is the boundary: above it the cap oversails the plate as a ROOF, below it the cap sits inset on a flat
  // roof as a centered GABLE — the country-lantern look. The cap stands ON the plate, so it never intersects.
  roof.add(geometryParams, "capSpread", 0.3, 2.5, 0.05).name("Cap Spread").onChange(rebuild);
  roof.open();

  const detail = gui.addFolder("Detail");
  // 1 lands on the corner centerlines; past 1.3 the plate oversails the cage like a country lantern.
  detail.add(geometryParams, "plateSpread", 0.8, 1.8, 0.01).name("Plate Spread").onChange(rebuild);
  // Grows downward — the plate stacks BELOW the cage, so no thickness can bury the bottom rail.
  detail.add(geometryParams, "plateThickness", 0.5, 5, 0.1).name("Plate Thickness").onChange(rebuild);
  detail.add(geometryParams, "finial").name("Finial").onChange(rebuild);
  detail.add(geometryParams, "candle").name("Candle").onChange(rebuild);
  detail.add(geometryParams, "candleHeight", 0.2, 0.9, 0.01).name("Candle Height").onChange(rebuild);

  // No rebuild — geometry is untouched by any of these.
  const materials = gui.addFolder("Materials");
  materials.addColor(colors, "iron").name("Iron").onChange(() => ironMaterial.color.set(colors.iron));
  materials.addColor(colors, "glass").name("Glass").onChange(() => {
    glassMaterial.color.set(colors.glass);
    glassMaterial.emissive.set(colors.glass);
  });
  materials.addColor(colors, "wax").name("Wax").onChange(() => waxMaterial.color.set(colors.wax));
  // Bound straight to the material — the glass is already `transparent`, so this only needs the value.
  // Wind it up and the panes go milky; wind it down and you read the candle through them.
  materials.add(glassMaterial, "opacity", 0, 1, 0.01).name("Glass Opacity");

  return () => {
    gui.destroy();
    lantern.geometry.dispose();
    ironMaterial.dispose();
    glassMaterial.dispose();
    waxMaterial.dispose();
    axes.dispose();
    dispose();
  };
}
