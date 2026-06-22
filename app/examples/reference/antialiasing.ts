import {
  BoxGeometry,
  GridHelper,
  IcosahedronGeometry,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  TorusKnotGeometry,
  Vector3,
} from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import GUI from "lil-gui";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Antialiasing" };

const METHODS = ["None", "MSAA (Native)", "FXAA (Post)", "SMAA (Post)"] as const;
type Method = (typeof METHODS)[number];

interface Built {
  camera: PerspectiveCamera;
  controls: OrbitControls;
  fxaaPass: ShaderPass;
  smaaPass: SMAAPass;
  /** Native MSAA state this renderer was built with (immutable for its life). */
  antialias: boolean;
  /** Whether the loop renders through the composer (post-AA) this frame. */
  useComposer: boolean;
  dispose(): void;
}

/**
 * Reference tool (not a library feature): compares antialiasing methods on edge-
 * heavy wireframe geometry.
 *
 * Two outlier behaviors worth calling out:
 *  1. Native MSAA is a context-creation attribute and can't be toggled on a live
 *     renderer — so switching to/from it disposes the scene and rebuilds with a
 *     different `antialias` flag (camera preserved). The legacy example reloaded
 *     the page with a `?msaa=true` URL param; our disposable scenes remove the need.
 *  2. Post-processing (FXAA/SMAA) needs control of the render call, so this
 *     example drives its own animation loop instead of using createScene's. The
 *     harness's dispose() still stops that loop and releases the renderer.
 */
export default function (container: HTMLElement) {
  const settings: { method: Method } = { method: "MSAA (Native)" };
  const savedPosition = new Vector3(0, 5, 15);
  const savedTarget = new Vector3(0, 0, 0);

  let current = build(settings.method === "MSAA (Native)");
  applyMethod();

  const gui = new GUI();
  const folder = gui.addFolder("Antialiasing");
  folder.add(settings, "method", METHODS as unknown as string[]).name("AA Method").onChange(applyMethod);
  folder.open();

  return () => {
    gui.destroy();
    current.dispose();
  };

  function applyMethod() {
    const wantMSAA = settings.method === "MSAA (Native)";
    // Only native MSAA needs the renderer rebuilt; everything else toggles live.
    if (wantMSAA !== current.antialias) {
      savedPosition.copy(current.camera.position);
      savedTarget.copy(current.controls.target);
      current.dispose();
      current = build(wantMSAA);
      current.camera.position.copy(savedPosition);
      current.controls.target.copy(savedTarget);
      current.controls.update();
    }
    current.useComposer = settings.method === "FXAA (Post)" || settings.method === "SMAA (Post)";
    current.fxaaPass.enabled = settings.method === "FXAA (Post)";
    current.smaaPass.enabled = settings.method === "SMAA (Post)";
  }

  function build(antialias: boolean): Built {
    const { scene, camera, controls, renderer, dispose: disposeScene } = createScene(container, {
      background: 0x1a1a2e,
      cameraPosition: [0, 5, 15],
      antialias,
    });
    controls.enableDamping = true;

    const animations: Array<() => void> = [];

    // Wireframe cube field — thin edges alias readily.
    const cubeGeometry = new BoxGeometry(1, 1, 1);
    const cubeMaterial = new MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const cube = new Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(x * 2, 0.5, z * 2);
        cube.rotation.y = Math.random() * Math.PI;
        scene.add(cube);
      }
    }

    // Rotating wireframe icosahedron + torus knot (lots of moving edges).
    const icosahedron = new Mesh(new IcosahedronGeometry(1.5, 0), new MeshBasicMaterial({ color: 0xff00ff, wireframe: true }));
    icosahedron.position.set(0, 3, 0);
    scene.add(icosahedron);
    animations.push(() => {
      icosahedron.rotation.x += 0.01;
      icosahedron.rotation.y += 0.01;
    });

    const torusKnot = new Mesh(new TorusKnotGeometry(1, 0.15, 100, 16), new MeshBasicMaterial({ color: 0xffff00, wireframe: true }));
    torusKnot.position.set(-5, 2, -5);
    scene.add(torusKnot);
    animations.push(() => {
      torusKnot.rotation.x += 0.005;
      torusKnot.rotation.y += 0.01;
    });

    // Solid thin pillars at angles (lit — these exercise edge AA on filled geo).
    const edgeGeometry = new BoxGeometry(0.1, 4, 0.1);
    for (let i = 0; i < 8; i++) {
      const material = new MeshStandardMaterial();
      material.color.setHSL(i / 8, 0.8, 0.6);
      const edge = new Mesh(edgeGeometry, material);
      const angle = (i / 8) * Math.PI * 2;
      edge.position.set(Math.cos(angle) * 6, 2, Math.sin(angle) * 6);
      edge.rotation.z = angle;
      scene.add(edge);
    }

    scene.add(new GridHelper(20, 20, 0x444444, 0x222222));

    // Post-processing chain: render → (optional) FXAA → (optional) SMAA.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.enabled = false;
    composer.addPass(fxaaPass);
    const smaaPass = new SMAAPass();
    smaaPass.enabled = false;
    composer.addPass(smaaPass);

    // composer.setSize propagates to passes (incl. SMAA); FXAA's resolution
    // uniform is the one thing it doesn't set, so we keep it in sync ourselves.
    const syncSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      composer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      fxaaPass.material.uniforms["resolution"].value.set(1 / (w * pr), 1 / (h * pr));
    };
    const sizeObserver = new ResizeObserver(syncSize);
    sizeObserver.observe(container);
    syncSize();

    const built: Built = {
      camera,
      controls,
      fxaaPass,
      smaaPass,
      antialias,
      useComposer: false,
      dispose() {
        sizeObserver.disconnect();
        composer.dispose();
        fxaaPass.dispose();
        smaaPass.dispose();
        scene.traverse((object) => {
          if (object instanceof Mesh || object instanceof LineSegments) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          }
        });
        disposeScene();
      },
    };

    // Own render loop (see header note). Reads built.useComposer live.
    renderer.setAnimationLoop(() => {
      for (const animate of animations) animate();
      controls.update();
      if (built.useComposer) composer.render();
      else renderer.render(scene, camera);
    });

    return built;
  }
}
