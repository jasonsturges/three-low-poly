import { AxesHelper, Color, Mesh, MeshStandardMaterial } from "three";
import GUI from "lil-gui";
import { createScene } from "../../../framework/createScene";
import { GroundGrid, createHewnTimberGeometry } from "three-low-poly";
import { frameObject } from "../../../framework/frameObject";

export const meta = {
  title: "Hewn Timber",
  description:
    "The round member — a low-segment cylinder pushed off-round so its facets read as axe-hewn rather " +
    "than turned. Authored along Y at unit length, so one geometry serves a whole rank at any size. The " +
    "perturbation is derived from each vertex's OWN position rather than a random source: that makes it " +
    "deterministic with no seed to thread through, and keeps the end caps watertight, because a cap " +
    "vertex and the side vertex it coincides with compute the same offset. Drop Amplitude to 0 to see " +
    "the lathed cylinder it starts as. The three frequencies are unequal on purpose — equal ones come " +
    "back into phase along the axis and band the surface into a visible helix. Contrast Weathered Plank, " +
    "which is the sawn member; a frame uses both.",
};

const mount = (container: HTMLElement) => {
  const handle = createScene(container, {
    background: 0x0a0b10,
    cameraPosition: [1.6, 1.2, 2.4],
  });
  const grid = new GroundGrid({ size: 4, divisions: 8, y: -1.1 });
  const axes = new AxesHelper(0.6);
  handle.scene.add(grid, axes);

  const params = {
    topRadius: 0.5,
    bottomRadius: 0.55,
    radialSegments: 6,
    heightSegments: 3,
    fx: 17.3,
    fy: 11.7,
    fz: 23.1,
    amplitude: 0.075,
    length: 2,
  };

  const materialParams = { color: "#6b5540", wireframe: false };
  const material = new MeshStandardMaterial({
    color: new Color(materialParams.color),
    roughness: 0.88,
    metalness: 0.02,
    flatShading: true,
  });

  const build = () =>
    createHewnTimberGeometry({
      topRadius: params.topRadius,
      bottomRadius: params.bottomRadius,
      radialSegments: params.radialSegments,
      heightSegments: params.heightSegments,
      frequency: [params.fx, params.fy, params.fz],
      amplitude: params.amplitude,
    });

  const mesh = new Mesh(build(), material);
  mesh.scale.y = params.length;
  mesh.castShadow = mesh.receiveShadow = true;
  handle.scene.add(mesh);
  frameObject(handle, mesh, { fit: 1.4 });

  function rebuild(): void {
    mesh.geometry.dispose();
    mesh.geometry = build();
    mesh.scale.y = params.length;
    // Re-center without re-dollying, so tuning the section does not snap your zoom.
    frameObject(handle, mesh, { dolly: false });
  }

  const gui = new GUI({ title: "Hewn Timber" });

  const section = gui.addFolder("Section");
  section.add(params, "topRadius", 0.1, 1, 0.01).name("Top radius").onChange(rebuild);
  section.add(params, "bottomRadius", 0.1, 1, 0.01).name("Bottom radius").onChange(rebuild);
  section.add(params, "radialSegments", 3, 16, 1).name("Facets").onChange(rebuild);
  section.add(params, "heightSegments", 1, 12, 1).name("Rings").onChange(rebuild);
  section.add(params, "length", 0.5, 6, 0.1).name("Length (scale)").onChange(rebuild);
  section.open();

  const hewing = gui.addFolder("Hewing");
  // At 0 this is a plain lathed cylinder — which is the point of the control.
  hewing.add(params, "amplitude", 0, 0.3, 0.005).name("Amplitude").onChange(rebuild);
  hewing.add(params, "fx", 0, 40, 0.1).name("Frequency X").onChange(rebuild);
  hewing.add(params, "fy", 0, 40, 0.1).name("Frequency Y").onChange(rebuild);
  hewing.add(params, "fz", 0, 40, 0.1).name("Frequency Z").onChange(rebuild);
  hewing.open();

  const presets = {
    "Library default (rustic fence)": () => {
      Object.assign(params, {
        bottomRadius: 0.55, radialSegments: 6, fx: 17.3, fy: 11.7, fz: 23.1, amplitude: 0.075,
      });
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      rebuild();
    },
    "City-park footbridge": () => {
      Object.assign(params, {
        bottomRadius: 0.54, radialSegments: 7, fx: 19.1, fy: 13.7, fz: 29.3, amplitude: 0.065,
      });
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      rebuild();
    },
  };
  const tunings = gui.addFolder("Tunings in use");
  for (const [name, fn] of Object.entries(presets)) tunings.add({ [name]: fn }, name);
  tunings.open();

  const materials = gui.addFolder("Material");
  materials.add(materialParams, "wireframe").name("Wireframe").onChange((v: boolean) => {
    material.wireframe = v;
  });
  materials.addColor(materialParams, "color").name("Color").onChange(() => {
    material.color.set(materialParams.color);
  });

  return () => {
    gui.destroy();
    mesh.geometry.dispose();
    material.dispose();
    grid.dispose();
    axes.dispose();
    handle.scene.clear();
    handle.dispose();
  };
};

export default mount;
