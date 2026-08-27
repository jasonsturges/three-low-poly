import GUI from "lil-gui";
import { AdditiveBlending, Color, Mesh, MeshBasicMaterial, NormalBlending, PlaneGeometry, SphereGeometry } from "three";
import { Easing, createLinearGradientTexture, type LinearGradientStop } from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = {
  title: "Linear Gradient",
  description: "A straight ramp baked to a DataTexture — start to end through an easing curve.",
};

export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container, { cameraPosition: [0, 3, 5.5] });

  const params = {
    inner: "#ffd8a0",
    outer: "#2f4d92",
    falloff: "smoothstep",
    stops: 12,
    size: 128,
    fadeAlpha: false,
    additive: false,
  };

  // One texture, unlit (full brightness), on a ground plane with a sphere sitting atop it.
  const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const plane = new Mesh(new PlaneGeometry(6, 6), material);
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
  const sphere = new Mesh(new SphereGeometry(1.3, 48, 48), material);
  sphere.position.y = 1.3;
  scene.add(sphere);

  // The gradient IS a curve: sample the chosen easing at `stops` points between the start and end
  // colours. More stops approximate the curve more closely; a few make the segments visible.
  const buildStops = (): LinearGradientStop[] => {
    const inner = new Color(params.inner);
    const outer = new Color(params.outer);
    const ease = Easing[params.falloff as keyof typeof Easing];
    const n = Math.max(2, params.stops);
    const stops: LinearGradientStop[] = [];
    for (let i = 0; i < n; i++) {
      const offset = i / (n - 1);
      const t = Math.min(1, Math.max(0, ease(offset)));
      stops.push({ offset, color: inner.clone().lerp(outer, t).getHex(), alpha: params.fadeAlpha ? 1 - offset : 1 });
    }
    return stops;
  };

  const rebuild = () => {
    material.map?.dispose();
    material.map = createLinearGradientTexture({ stops: buildStops(), size: params.size, easing: Easing.linear });
    material.blending = params.additive ? AdditiveBlending : NormalBlending;
    material.needsUpdate = true;
  };
  rebuild();

  const gui = new GUI();
  gui.title("Linear Gradient");
  gui.addColor(params, "inner").name("Start").onChange(rebuild);
  gui.addColor(params, "outer").name("End").onChange(rebuild);
  gui.add(params, "falloff", Object.keys(Easing)).name("Falloff").onChange(rebuild);
  gui.add(params, "stops", 2, 32, 1).name("Stops").onChange(rebuild);
  gui.add(params, "size", 4, 512, 4).name("Resolution").onChange(rebuild);
  gui.add(params, "fadeAlpha").name("Fade Alpha").onChange(rebuild);
  gui.add(params, "additive").name("Additive Blend").onChange(rebuild);

  return () => {
    gui.destroy();
    plane.geometry.dispose();
    sphere.geometry.dispose();
    material.map?.dispose();
    material.dispose();
    dispose();
  };
}
