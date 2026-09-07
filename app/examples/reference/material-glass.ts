import GUI from "lil-gui";
import {
  BoxGeometry,
  DataTexture,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  SphereGeometry,
  Vector2,
  type BufferGeometry,
  type RenderTarget,
  type Texture,
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
    "transmission: clear, frosted, absorbing, dispersive, rippled, and iridescent. Change the shared shape, then select a " +
    "sample by clicking or tapping the glass, or using Inspect Sample. Stripes behind each sample reveal refraction and blur; a studio " +
    "environment supplies reflections. These are raster techniques, not ray-traced glass or caustics.",
};

// Stylized recipes are deliberately separate from the transmission recipes. A physical
// material can have transmission OFF: its class name alone does not tell you its rendering cost.
interface GlassRecipe {
  title: string;
  subtitle: string;
  note: string;
  make: (rippleTexture: Texture) => MeshStandardMaterial;
}

// A seamless tangent-space normal map, derived from a periodic height field. It changes the
// surface normals used for lighting and refraction, not the geometry or the raycast silhouette.
function createRippleTexture(): DataTexture {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const dx = Math.cos(u) * 0.65 + Math.cos(u + v) * 0.25 - Math.cos(2 * v - u) * 0.15;
      const dy = Math.cos(u + v) * 0.25 + Math.cos(2 * v - u) * 0.3;
      const length = Math.hypot(dx, dy, 1);
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round((1 - dx / length) * 127.5);
      pixels[offset + 1] = Math.round((1 - dy / length) * 127.5);
      pixels[offset + 2] = Math.round((1 + 1 / length) * 127.5);
      pixels[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(pixels, size, size);
  // Normal vectors are data, so keep the default NoColorSpace; no sRGB conversion.
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

const recipes: GlassRecipe[] = [
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
    note: "Alpha transparency plus clearcoat. Highlights suggest glass without refracting the background. Clearcoat adds shading work; this is not a zero-cost material.",
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
    note: "Backlit glass: tinted opacity and emissive color. Emission brightens the surface; it does not cast light or create a halo here. Add scene lighting and bloom for illumination and glow beyond the surface.",
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
    note: "Chandelier approach: near-white, smooth, slightly metallic, opaque facets. Try Faceted crystal. Reflections and geometry suggest sparkle, but you cannot see through it. No bloom is applied here.",
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
  {
    title: "Rippled glass",
    subtitle: "Physical · textured refraction",
    note: "A repeating normal map gives clear glass an uneven surface, bending the stripes into waves. Try Window pane and vary Ripple Strength and Ripple Repeats. The silhouette stays unchanged; sculpted ridges would require geometry.",
    make: (normalMap) =>
      new MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.07,
        thickness: 0.4,
        ior: 1.5,
        normalMap,
        normalScale: new Vector2(0.45, 0.45),
      }),
  },
  {
    title: "Iridescent glass",
    subtitle: "Physical · thin-film coating",
    note: "A thin coating shifts reflection colors with viewing angle. Orbit the glass or vary Film Thickness to explore interference colors. This colors the reflected light, unlike dispersion in transmitted light. No metallic tint or rainbow texture is used.",
    make: () =>
      new MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.08,
        thickness: 0.65,
        ior: 1.5,
        iridescence: 1,
        iridescenceIOR: 1.8,
        iridescenceThicknessRange: [100, 420],
      }),
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
  const rippleTexture = createRippleTexture();
  const stripeMaterials = [0xe8e4d9, 0x192b3e, 0xd57549, 0x4ba9b2].map((color) => new MeshBasicMaterial({ color }));
  const labels: ReturnType<typeof createTextSprite>[] = [];
  const samples = recipes.map((recipe, index) => {
    const group = new Group();
    const columns = 4;
    const row = Math.floor(index / columns);
    const rowCount = Math.ceil(recipes.length / columns);
    const columnsInRow = Math.min(columns, recipes.length - row * columns);
    group.position.set(((index % columns) - (columnsInRow - 1) / 2) * 2.8, ((rowCount - 1) / 2 - row) * 3.3, 0);
    const material = recipe.make(rippleTexture);
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
      if (recipe.title === "Rippled glass") {
        const ripple = { strength: material.normalScale.x, repeats: rippleTexture.repeat.x };
        inspector
          .add(ripple, "strength", 0, 1.5, 0.01)
          .name("Ripple Strength")
          .onChange((value: number) => material.normalScale.set(value, value));
        inspector
          .add(ripple, "repeats", 1, 12, 1)
          .name("Ripple Repeats")
          .onChange((value: number) => rippleTexture.repeat.set(value, value));
      }
      if (recipe.title === "Iridescent glass") {
        inspector.add(material, "iridescence", 0, 1, 0.01).name("Iridescence");
        inspector.add(material, "iridescenceIOR", 1, 2.5, 0.01).name("Film IOR");
        const film = { thickness: material.iridescenceThicknessRange[1] };
        // Without a thickness map, Three uses the upper end of the range, in nanometers.
        inspector
          .add(film, "thickness", 0, 1200, 1)
          .name("Film Thickness (nm)")
          .onChange((value: number) => {
            material.iridescenceThicknessRange = [value, value];
          });
      }
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
            const defaults = recipe.make(rippleTexture);
            if (recipe.title === "Rippled glass") rippleTexture.repeat.set(4, 4);
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
  const sampleControl = gui
    .add(
      params,
      "sample",
      recipes.map((recipe) => recipe.title),
    )
    .name("Inspect Sample")
    .onChange(inspect);

  // Pick only glass meshes, so stripes and labels do not intercept the ray. Track the whole gesture:
  // moving away and back still counts as a drag, and a second finger cancels tap selection.
  const canvas = renderer.domElement;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let tap: { id: number; x: number; y: number } | undefined;
  const cancelTap = () => {
    tap = undefined;
  };
  const pointerDown = (event: PointerEvent) => {
    tap = event.isPrimary && event.button === 0 ? { id: event.pointerId, x: event.clientX, y: event.clientY } : undefined;
  };
  const pointerMove = (event: PointerEvent) => {
    if (tap && event.pointerId === tap.id && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 6) cancelTap();
  };
  const pointerUp = (event: PointerEvent) => {
    const start = tap;
    cancelTap();
    if (!start || event.pointerId !== start.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    if (Math.abs(pointer.x) > 1 || Math.abs(pointer.y) > 1) return;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    const visible = samples.filter((sample) => sample.group.visible);
    const hit = raycaster.intersectObjects(
      visible.map((sample) => sample.mesh),
      false,
    )[0];
    const sample = visible.find((sample) => sample.mesh === hit?.object);
    if (sample && sample.recipe.title !== params.sample) sampleControl.setValue(sample.recipe.title);
  };
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", cancelTap);
  canvas.addEventListener("pointerleave", cancelTap);
  inspect();
  frame();
  onFrame((delta) => {
    if (params.animate)
      samples.forEach((sample) => {
        sample.mesh.rotation.y += delta * 0.35;
      });
  });

  return () => {
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", cancelTap);
    canvas.removeEventListener("pointerleave", cancelTap);
    gui.destroy();
    info.remove();
    stopEnvironmentSetup();
    scene.environment = null;
    environment?.dispose();
    Object.values(shapes).forEach((geometry) => geometry.dispose());
    tile.dispose();
    rippleTexture.dispose();
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
