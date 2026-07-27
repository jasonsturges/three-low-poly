import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createScene } from "../../framework/createScene";
import { frameObject } from "../../framework/frameObject";
import { GroundGrid, PumpkinGeometry, type PumpkinGeometryOptions } from "three-low-poly";
import type { ExampleMeta, ExampleMount } from "../../framework/example";

export const meta: ExampleMeta = {
  description:
    "The union of rind + stem as one cohesive PumpkinGeometry (a BufferGeometry subclass, used the BoxGeometry way): a single Mesh carrying a [rind, stem] materials array driven by the geometry's groups. Geometry params fully rebuild the geometry; material colors mutate in place.",
};

const mount: ExampleMount = (container) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [4, 2.5, 6],
  });
  const { scene } = handle;

  const grid = new GroundGrid({ size: 8, divisions: 8 });
  const axes = new AxesHelper(1.5);
  scene.add(grid, axes);

  // Geometry parameters — the union of the rind and stem component options.
  // Hand-copied defaults again, keeping the single-source-of-truth question in
  // view across all three examples.
  const geometryParams: Required<PumpkinGeometryOptions> = {
    rindRadius: 1,
    rindWidthSegments: 16,
    rindHeightSegments: 8,
    rindRibs: 8,
    rindRibDepth: 0.075,
    rindSquash: 0.82,
    stemTopRadius: 0.1,
    stemBottomRadius: 0.14,
    stemHeight: 0.38,
    stemSegments: 5,
    stemSink: 0.1,
    stemLean: 0,
    stemTwist: 0,
  };

  // Material parameters live outside the geometry — they never trigger a
  // geometry rebuild, only an in-place color mutation.
  const materialParams = {
    rindColor: "#804319",
    stemColor: "#30311f",
  };

  // Materials array indexed by the geometry's groups: 0 = rind, 1 = stem. We own
  // these instances, so color changes mutate them directly.
  const rindMaterial = new MeshStandardMaterial({
    color: new Color(materialParams.rindColor),
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const stemMaterial = new MeshStandardMaterial({
    color: new Color(materialParams.stemColor),
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  // Used the BoxGeometry way: `new PumpkinGeometry(options)` into a Mesh.
  const mesh = new Mesh(new PumpkinGeometry(geometryParams), [rindMaterial, stemMaterial]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Full geometry rebuild: parameters are baked at construction, so a change
  // means a fresh PumpkinGeometry. Dispose-then-replace — the Mesh persists, so
  // rotation and camera survive untouched, and the old GPU buffers are released.
  function rebuild(): void {
    mesh.geometry.dispose();
    mesh.geometry = new PumpkinGeometry(geometryParams);
  }

  frameObject(handle, mesh);

  const gui = new GUI();
  gui.title("Pumpkin");

  const rindFolder = gui.addFolder("Rind");
  rindFolder.add(geometryParams, "rindRadius", 0.1, 2, 0.01).name("Radius").onChange(rebuild);
  rindFolder.add(geometryParams, "rindWidthSegments", 3, 48, 1).name("Width segments").onChange(rebuild);
  rindFolder.add(geometryParams, "rindHeightSegments", 2, 32, 1).name("Height segments").onChange(rebuild);
  rindFolder.add(geometryParams, "rindRibs", 0, 24, 1).name("Ribs").onChange(rebuild);
  rindFolder.add(geometryParams, "rindRibDepth", 0, 0.3, 0.005).name("Rib depth").onChange(rebuild);
  rindFolder.add(geometryParams, "rindSquash", 0.3, 1.5, 0.01).name("Squash").onChange(rebuild);

  const stemFolder = gui.addFolder("Stem");
  stemFolder.add(geometryParams, "stemTopRadius", 0.02, 0.3, 0.005).name("Top radius").onChange(rebuild);
  stemFolder.add(geometryParams, "stemBottomRadius", 0.02, 0.3, 0.005).name("Bottom radius").onChange(rebuild);
  stemFolder.add(geometryParams, "stemHeight", 0.1, 1, 0.01).name("Height").onChange(rebuild);
  stemFolder.add(geometryParams, "stemSegments", 3, 16, 1).name("Segments").onChange(rebuild);

  // Assembly tier: how the parts join, owned by neither component. Subject-
  // prefixed because only the stem moves here — the unit stays at rest.
  const assemblyFolder = gui.addFolder("Assembly");
  assemblyFolder.add(geometryParams, "stemSink", 0, 0.4, 0.005).name("Stem sink").onChange(rebuild);
  assemblyFolder.add(geometryParams, "stemLean", -0.6, 0.6, 0.01).name("Stem lean").onChange(rebuild);
  assemblyFolder.add(geometryParams, "stemTwist", 0, Math.PI * 2, 0.01).name("Stem twist").onChange(rebuild);

  // Materials mutate in place — no geometry rebuild, following the prototype's
  // isolated material-change pattern.
  const materialsFolder = gui.addFolder("Materials");
  materialsFolder.addColor(materialParams, "rindColor").name("Rind").onChange(() => {
    rindMaterial.color.set(materialParams.rindColor);
  });
  materialsFolder.addColor(materialParams, "stemColor").name("Stem").onChange(() => {
    stemMaterial.color.set(materialParams.stemColor);
  });

  return () => {
    gui.destroy();
    mesh.geometry.dispose();
    rindMaterial.dispose();
    stemMaterial.dispose();
    grid.dispose();
    axes.dispose();
    scene.clear();
    handle.dispose();
  };
};

export default mount;
