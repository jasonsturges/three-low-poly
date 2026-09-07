import GUI from "lil-gui";
import {
  BoxGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  type BufferGeometry,
  type RenderTarget,
} from "three";
import { PMREMGenerator } from "three/webgpu";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FlorenceFlaskGeometry } from "three-low-poly";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";
import { frameObject } from "../../framework/frameObject";
import { gradientBackdrop } from "../../framework/gradientBackdrop";

export const meta = {
  title: "Material Glass",
  description:
    "Compare alpha-blended panes, clearcoated lab glass, emissive windows, faux crystal, and physical " +
    "transmission: clear, frosted, absorbing, and dispersive. Change the shared shape, then select a " +
    "sample to inspect its material. Stripes behind each sample reveal refraction and blur; a studio " +
    "environment supplies reflections. These are raster techniques, not ray-traced glass or caustics.",
};

// Website-inspired recipes are deliberately separate from the transmission recipes. A physical
// material can have transmission OFF: its class name alone does not tell you its rendering cost.
const recipes = [
  {
    title: "Alpha pane",
    subtitle: "Standard · opacity",
    note: "Tinted transparency with surface highlights. The background stays undistorted. No transmission pass; overlapping transparent surfaces can still be expensive and need sorting.",
    make: () =>
      new MeshStandardMaterial({
        color: 0xb6d5df,
        transparent: true,
        opacity: 0.22,
        roughness: 0.08,
        depthWrite: false,
        side: DoubleSide,
      }),
  },
  {
    title: "Coated lab glass",
    subtitle: "Physical · transmission off",
    note: "Mad Science approach: alpha transparency plus clearcoat. Highlights suggest glass without refracting the background. Clearcoat adds shading work; this is not a zero-cost material.",
    make: () =>
      new MeshPhysicalMaterial({
        color: 0x6a7d8c,
        transparent: true,
        opacity: 0.22,
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        depthWrite: false,
        side: DoubleSide,
      }),
  },
  {
    title: "Emissive window",
    subtitle: "Standard · tinted glow",
    note: "Cathedral-inspired backlit glass: tinted opacity and emissive color. Emission brightens the surface; it does not cast light or create a halo here. The website also supplies lighting and bloom.",
    make: () =>
      new MeshStandardMaterial({
        color: 0x6a8aab,
        emissive: 0x779bcc,
        emissiveIntensity: 1.6,
        roughness: 0.4,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: DoubleSide,
      }),
  },
  {
    title: "Faux crystal",
    subtitle: "Standard · opaque sparkle",
    note: "Music Room chandelier approach: near-white, smooth, slightly metallic, opaque facets. Try Faceted crystal. Reflections and geometry suggest sparkle, but you cannot see through it. No bloom is applied here.",
    make: () => new MeshStandardMaterial({ color: 0xeef2f7, roughness: 0.05, metalness: 0.1, flatShading: true }),
  },
  {
    title: "Clear transmission",
    subtitle: "Physical · refraction",
    note: "Built-in physical transmission keeps reflections while sampling the scene behind the object. IOR and material thickness bend that sample. Opacity stays at 1. Extra scene rendering and sampling cost more than a simple alpha pane.",
    make: () => new MeshPhysicalMaterial({ transmission: 1, roughness: 0.03, thickness: 0.65, ior: 1.5 }),
  },
  {
    title: "Frosted glass",
    subtitle: "Physical · rough transmission",
    note: "The same physical transmission model with higher roughness: highlights broaden and the transmitted scene blurs. This is a surface approximation, not a simulation of scattering inside a volume.",
    make: () => new MeshPhysicalMaterial({ transmission: 1, roughness: 0.38, thickness: 0.65, ior: 1.5 }),
  },
  {
    title: "Absorbing glass",
    subtitle: "Physical · volume tint",
    note: "A white surface with amber absorption. Attenuation color and distance control the tint acquired through the material thickness. Material thickness is an optical parameter, separate from the actual mesh dimensions.",
    make: () =>
      new MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.06,
        thickness: 0.9,
        ior: 1.5,
        attenuationColor: 0xd69a42,
        attenuationDistance: 0.6,
      }),
  },
  {
    title: "Dispersive crystal",
    subtitle: "Physical · spectral separation",
    note: "Dispersion separates color channels in transmitted light. Try the crystal shape and inspect the stripe edges. This is already part of MeshPhysicalMaterial; it is not a separate glass class. It adds transmission sampling work.",
    make: () => new MeshPhysicalMaterial({ transmission: 1, roughness: 0.02, thickness: 0.9, ior: 1.7, dispersion: 0.8 }),
  },
];

export default function (container: HTMLElement) {
  const handle = createScene(container, { cameraPosition: [0, 0, 14] });
  const { scene, renderer, camera, onFrame, dispose } = handle;
  const disposeBackdrop = gradientBackdrop(scene);
  camera.fov = 40;
  camera.updateProjectionMatrix();

  // No external HDR download. Generate the reflection environment after the harness initializes
  // the renderer. The background wash alone is not an environment map for material reflections.
  let environment: RenderTarget | undefined;
  const stopEnvironmentSetup = onFrame(() => {
    if (environment) return;
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(renderer);
    try {
      environment = generator.fromScene(room, 0, 0.1, 100, { size: 128 });
      scene.environment = environment.texture;
    } finally {
      room.dispose();
      generator.dispose();
    }
  });

  const shapes = {
    Sphere: new SphereGeometry(0.67, 48, 32),
    "Window pane": new BoxGeometry(1.25, 1.45, 0.08),
    Flask: new FlorenceFlaskGeometry({ bodyRadius: 0.52, neckRadius: 0.15, neckHeight: 0.45, radialSegments: 48 }),
    "Faceted crystal": new IcosahedronGeometry(0.78, 0),
  };
  shapes.Flask.center();
  const params = {
    shape: "Sphere" as keyof typeof shapes,
    sample: recipes[4]!.title,
    isolate: false,
    backdrop: true,
    environment: 1,
    animate: false,
  };
  const stage = new Group();
  scene.add(stage);
  const tile = new PlaneGeometry(0.24, 1.75);
  const stripeMaterials = [0xe8e4d9, 0x192b3e, 0xd57549, 0x4ba9b2].map((color) => new MeshBasicMaterial({ color }));
  const labels: ReturnType<typeof createTextSprite>[] = [];
  const samples = recipes.map((recipe, index) => {
    const group = new Group();
    group.position.set(((index % 4) - 1.5) * 2.8, index < 4 ? 1.65 : -1.65, 0);
    const material = recipe.make();
    const mesh = new Mesh<BufferGeometry, MeshStandardMaterial>(shapes.Sphere, material);
    group.add(mesh);

    // Opaque geometry participates in the transmission buffer; transparent props are not a reliable
    // target for this comparison. Leave space between the glass and the board so distortion reads.
    const backdrop = new Group();
    for (let stripe = 0; stripe < 8; stripe++) {
      const bar = new Mesh(tile, stripeMaterials[stripe % stripeMaterials.length]);
      bar.position.set((stripe - 3.5) * 0.24, 0, -1);
      backdrop.add(bar);
    }
    group.add(backdrop);
    [recipe.title, recipe.subtitle].forEach((text, line) => {
      const label = createTextSprite(text, {
        size: 64,
        scale: line ? 0.25 : 0.34,
        color: line ? "#a4b4c5" : "#ffffff",
        y: -1.12 - line * 0.3,
        z: 0.2,
      });
      label.material.depthTest = false;
      group.add(label);
      labels.push(label);
    });
    stage.add(group);
    return { group, mesh, material, backdrop, recipe };
  });

  const info = document.createElement("div");
  info.style.cssText =
    "position:absolute;bottom:16px;left:50%;transform:translateX(-50%);width:min(560px,calc(100% - 32px));padding:12px 16px;background:#101720e8;border:1px solid #344253;border-radius:8px;color:#d8e2ed;font:13px/1.5 system-ui;pointer-events:none;";
  container.appendChild(info);
  const gui = new GUI();
  gui.title("Glass Reference");
  const selected = () => samples.find((sample) => sample.recipe.title === params.sample)!;
  const frame = () => {
    const direction = camera.position.clone().sub(handle.controls.target).normalize();
    frameObject(handle, params.isolate ? selected().group : stage, { fit: params.isolate ? 1.3 : 0.95 });
    const distance = camera.position.distanceTo(handle.controls.target);
    camera.position.copy(handle.controls.target).addScaledVector(direction, distance);
    handle.controls.update();
  };
  const updateLayout = () => {
    samples.forEach((sample) => {
      sample.group.visible = !params.isolate || sample === selected();
    });
    frame();
  };
  gui
    .add(params, "shape", Object.keys(shapes))
    .name("Shared Shape")
    .onChange(() => {
      samples.forEach((sample) => {
        sample.mesh.geometry = shapes[params.shape];
      });
    });
  gui.add(params, "isolate").name("Isolate Selected").onChange(updateLayout);
  gui
    .add(params, "backdrop")
    .name("Stripe Backdrops")
    .onChange((visible: boolean) =>
      samples.forEach((sample) => {
        sample.backdrop.visible = visible;
      }),
    );
  gui
    .add(params, "environment", 0, 3, 0.05)
    .name("Environment Light")
    .onChange((value: number) => {
      scene.environmentIntensity = value;
    });
  gui.add(params, "animate").name("Rotate Samples");
  gui.add({ frame }, "frame").name("Frame View");
  let inspector: GUI | undefined;
  const inspect = () => {
    inspector?.destroy();
    const { material, recipe } = selected();
    samples.forEach((sample, index) => labels[index * 2]!.material.color.set(sample === selected() ? 0x72d9ed : 0xffffff));
    info.textContent = `${recipe.title} — ${recipe.note}`;
    inspector = gui.addFolder("Selected Material");
    const color = { color: `#${material.color.getHexString()}`, emissive: `#${material.emissive.getHexString()}` };
    inspector
      .addColor(color, "color")
      .name("Surface Color")
      .onChange((value: string) => material.color.set(value));
    inspector.add(material, "roughness", 0, 1, 0.01).name("Roughness");
    inspector.add(material, "metalness", 0, 1, 0.01).name("Metalness");
    if (material.transparent) inspector.add(material, "opacity", 0, 1, 0.01).name("Alpha Opacity");
    if (recipe.title === "Emissive window") {
      inspector
        .addColor(color, "emissive")
        .name("Emission Color")
        .onChange((value: string) => material.emissive.set(value));
      inspector.add(material, "emissiveIntensity", 0, 4, 0.05).name("Emission");
    }
    if (material instanceof MeshPhysicalMaterial) {
      inspector.add(material, "ior", 1, 2.33, 0.01).name("IOR");
      inspector.add(material, "clearcoat", 0, 1, 0.01).name("Clearcoat");
      inspector.add(material, "clearcoatRoughness", 0, 1, 0.01).name("Coat Roughness");
      if (!material.transparent) {
        inspector.add(material, "transmission", 0, 1, 0.01).name("Transmission");
        inspector.add(material, "thickness", 0, 2, 0.01).name("Optical Thickness");
        inspector.add(material, "dispersion", 0, 1, 0.01).name("Dispersion");
        const volume = {
          color: `#${material.attenuationColor.getHexString()}`,
          absorption: Number.isFinite(material.attenuationDistance),
          distance: Number.isFinite(material.attenuationDistance) ? material.attenuationDistance : 1,
        };
        const updateAbsorption = () => {
          material.attenuationDistance = volume.absorption ? volume.distance : Infinity;
        };
        inspector.add(volume, "absorption").name("Absorption").onChange(updateAbsorption);
        inspector
          .addColor(volume, "color")
          .name("Absorption Color")
          .onChange((value: string) => material.attenuationColor.set(value));
        inspector.add(volume, "distance", 0.05, 5, 0.05).name("Attenuation Distance").onChange(updateAbsorption);
      }
    }
    inspector
      .add(
        {
          reset: () => {
            const defaults = recipe.make();
            material.copy(defaults);
            material.needsUpdate = true;
            defaults.dispose();
            inspect();
          },
        },
        "reset",
      )
      .name("Reset Selected Material");
    inspector.open();
    if (params.isolate) updateLayout();
  };
  gui
    .add(
      params,
      "sample",
      recipes.map((recipe) => recipe.title),
    )
    .name("Inspect Sample")
    .onChange(inspect);
  inspect();
  frame();
  onFrame((delta) => {
    if (params.animate)
      samples.forEach((sample) => {
        sample.mesh.rotation.y += delta * 0.35;
      });
  });

  return () => {
    gui.destroy();
    info.remove();
    stopEnvironmentSetup();
    scene.environment = null;
    environment?.dispose();
    Object.values(shapes).forEach((geometry) => geometry.dispose());
    tile.dispose();
    stripeMaterials.forEach((material) => material.dispose());
    samples.forEach((sample) => sample.material.dispose());
    labels.forEach((label) => {
      label.material.map?.dispose();
      label.material.dispose();
    });
    disposeBackdrop();
    dispose();
  };
}
