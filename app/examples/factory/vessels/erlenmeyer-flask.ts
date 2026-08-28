import GUI from "lil-gui";
import { Color, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { LiquidFillGeometry, ErlenmeyerFlaskGeometry } from "three-low-poly";
import { createScene } from "../../../framework/createScene";
import { frameObject } from "../../../framework/frameObject";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = { title: "Erlenmeyer Flask" };

export default function (container: HTMLElement) {
  const handle = createScene(container);
  const { scene, dispose } = handle;
  const disposeBackdrop = gradientBackdrop(scene);

  const params = {
    bodyRadius: 1,
    neckRadius: 0.3,
    bodyHeight: 2.5,
    neckHeight: 1,
    radialSegments: 16,
    rim: 0.4,
    fill: 0.35,
    color: 0x4bbfa0,
    opacity: 0.85,
    glow: 0.6,
    gap: 0.04,
  };

  const glass = new MeshPhysicalMaterial({
    color: 0x9fdfff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.9,
    ior: 1.5,
  });

  // The example owns the liquid's material, so color, opacity and glow mutate in place and never touch the
  // geometry. Left permanently transparent: the opacity dial drives the look, and flipping that flag would
  // force a program recompile for no visible gain.
  const liquidMaterial = new MeshStandardMaterial({
    color: params.color,
    transparent: true,
    opacity: params.opacity,
    roughness: 0.25,
    emissive: new Color(params.color),
    emissiveIntensity: params.glow,
  });

  let shellGeometry = new ErlenmeyerFlaskGeometry({
    bodyRadius: params.bodyRadius,
    neckRadius: params.neckRadius,
    bodyHeight: params.bodyHeight,
    neckHeight: params.neckHeight,
    radialSegments: params.radialSegments,
    rim: params.rim,
  });
  const shell = new Mesh(shellGeometry, glass);
  // The liquid and the glass share a center, so depth sorting has nothing to say — state the order.
  shell.renderOrder = 1;

  // Cut from the shell's own profile, so the liquid can never clip through the glass.
  const liquid = new Mesh(
    new LiquidFillGeometry({
      profile: shellGeometry.profile,
      fill: params.fill,
      inset: params.gap,
      radialSegments: params.radialSegments,
    }),
    liquidMaterial,
  );
  liquid.renderOrder = 0;
  // An empty vessel lathes to a geometry with no attributes — hide the mesh rather than let it reach the renderer.
  liquid.visible = params.fill > 0;

  scene.add(shell, liquid);

  // Framed once, here. Both meshes persist across every dial, so the viewer's pan and zoom are never disturbed.
  frameObject(handle, shell);

  // Level and wall gap are geometry — dispose then replace, and the Mesh carries on.
  const rebuildLiquid = () => {
    liquid.geometry.dispose();
    liquid.geometry = new LiquidFillGeometry({
      profile: shellGeometry.profile,
      fill: params.fill,
      inset: params.gap,
      radialSegments: params.radialSegments,
    });
    liquid.visible = params.fill > 0;
  };

  // The shell's profile is the liquid's input, so re-cut the liquid whenever the shell changes.
  const rebuildShell = () => {
    shell.geometry.dispose();
    shellGeometry = new ErlenmeyerFlaskGeometry({
      bodyRadius: params.bodyRadius,
      neckRadius: params.neckRadius,
      bodyHeight: params.bodyHeight,
      neckHeight: params.neckHeight,
      radialSegments: params.radialSegments,
      rim: params.rim,
    });
    shell.geometry = shellGeometry;
    rebuildLiquid();
  };

  const gui = new GUI();
  gui.title("Erlenmeyer Flask");
  gui.add(params, "bodyRadius", 0.3, 2, 0.01).name("Body Radius").onChange(rebuildShell);
  gui.add(params, "neckRadius", 0.1, 0.8, 0.01).name("Neck Radius").onChange(rebuildShell);
  gui.add(params, "bodyHeight", 0.5, 4, 0.01).name("Body Height").onChange(rebuildShell);
  gui.add(params, "neckHeight", 0.1, 3, 0.01).name("Neck Height").onChange(rebuildShell);
  gui.add(params, "radialSegments", 3, 64, 1).name("Radial Segments").onChange(rebuildShell);
  gui.add(params, "rim", 0, 0.8, 0.01).name("Rim").onChange(rebuildShell);

  const fillFolder = gui.addFolder("Fill");
  fillFolder.add(params, "fill", 0, 1, 0.01).name("Fill").onChange(rebuildLiquid);
  fillFolder.add(params, "gap", 0, 0.2, 0.005).name("Gap").onChange(rebuildLiquid);
  fillFolder.addColor(params, "color").name("Color").onChange(() => {
    liquidMaterial.color.set(params.color);
    liquidMaterial.emissive.set(params.color);
  });
  fillFolder.add(params, "opacity", 0, 1, 0.01).name("Opacity").onChange(() => {
    liquidMaterial.opacity = params.opacity;
  });
  fillFolder.add(params, "glow", 0, 2, 0.01).name("Glow").onChange(() => {
    liquidMaterial.emissiveIntensity = params.glow;
  });
  fillFolder.open();

  return () => {
    gui.destroy();
    shell.geometry.dispose();
    liquid.geometry.dispose();
    glass.dispose();
    liquidMaterial.dispose();
    disposeBackdrop();
    dispose();
  };
}
