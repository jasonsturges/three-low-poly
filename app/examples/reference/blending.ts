import {
  AdditiveBlending,
  Blending,
  Color,
  CustomBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MultiplyBlending,
  NormalBlending,
  PlaneGeometry,
  SphereGeometry,
  SubtractiveBlending,
} from "three";
import GUI from "lil-gui";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Blending Modes" };

/**
 * Reference tool (not a library feature): overlapping translucent planes,
 * spheres, and orbiting sprites for eyeballing how Three's blend modes,
 * opacity, and depth flags interact. Imports nothing from three-low-poly.
 */
export default function (container: HTMLElement) {
  const { scene, camera, controls, onFrame, dispose } = createScene(container, {
    background: 0x1a1a1a,
    cameraPosition: [0, 5, 20],
  });
  controls.enableDamping = true;

  // Materials whose blend settings the GUI drives. Collected as we build.
  const blendable: MeshBasicMaterial[] = [];

  const planeGeometry = new PlaneGeometry(8, 8);
  const addPlane = (color: number, x: number, y: number, z: number, ry: number) => {
    const material = new MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: DoubleSide });
    const plane = new Mesh(planeGeometry, material);
    plane.position.set(x, y, z);
    plane.rotation.y = ry;
    scene.add(plane);
    blendable.push(material);
  };
  addPlane(0xff0000, -3, 2, 0, Math.PI / 6); // red
  addPlane(0x00ff00, 3, 2, 0, -Math.PI / 6); // green
  addPlane(0x0000ff, 0, 2, -2, 0); // blue

  const sphereGeometry = new SphereGeometry(1.5, 32, 32);
  const addSphere = (color: number, x: number, y: number, z: number) => {
    const material = new MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: AdditiveBlending });
    const sphere = new Mesh(sphereGeometry, material);
    sphere.position.set(x, y, z);
    scene.add(sphere);
    blendable.push(material);
  };
  addSphere(0x00ffff, -2, -2, 2); // cyan
  addSphere(0xff00ff, 2, -2, 2); // magenta
  addSphere(0xffff00, 0, -2, 0); // yellow

  // Orbiting, camera-facing sprites for an additive "particle" feel.
  const spriteGeometry = new PlaneGeometry(2, 2);
  const sprites: Mesh[] = [];
  for (let i = 0; i < 20; i++) {
    const material = new MeshBasicMaterial({
      color: new Color().setHSL(i / 20, 1, 0.5),
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
    });
    const sprite = new Mesh(spriteGeometry, material);
    const angle = (i / 20) * Math.PI * 2;
    const radius = 8;
    sprite.position.set(Math.cos(angle) * radius, Math.sin(angle * 3) * 2 + 6, Math.sin(angle) * radius);
    scene.add(sprite);
    sprites.push(sprite);
    blendable.push(material);
  }
  onFrame(() => {
    for (const sprite of sprites) {
      sprite.rotation.z += 0.01;
      sprite.lookAt(camera.position);
    }
  });

  // Dim backdrop (not blend-driven — fixed reference).
  const bgGeometry = new PlaneGeometry(50, 30);
  const bg = new Mesh(bgGeometry, new MeshBasicMaterial({ color: 0x2a2a4a, transparent: true, opacity: 0.3 }));
  bg.position.z = -10;
  scene.add(bg);

  const blendModes: Record<string, Blending> = {
    Normal: NormalBlending,
    Additive: AdditiveBlending,
    Subtractive: SubtractiveBlending,
    Multiply: MultiplyBlending,
    Custom: CustomBlending,
  };

  // Defaults match the legacy reference: the dropdown reads "Normal" while
  // spheres/sprites keep their constructor-set AdditiveBlending — no uniform
  // mode is applied until the GUI is touched, preserving the mixed initial look.
  const settings = { blendMode: "Normal", opacity: 0.7, depthWrite: true, depthTest: true };

  const apply = () => {
    for (const material of blendable) {
      material.blending = blendModes[settings.blendMode];
      material.opacity = settings.opacity;
      material.depthWrite = settings.depthWrite;
      material.depthTest = settings.depthTest;
      material.needsUpdate = true;
    }
  };

  const gui = new GUI();
  const blendingFolder = gui.addFolder("Blending");
  blendingFolder.add(settings, "blendMode", Object.keys(blendModes)).name("Blend Mode").onChange(apply);
  blendingFolder.add(settings, "opacity", 0, 1, 0.01).name("Opacity").onChange(apply);
  blendingFolder.add(settings, "depthWrite").name("Depth Write").onChange(apply);
  blendingFolder.add(settings, "depthTest").name("Depth Test").onChange(apply);
  blendingFolder.open();

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.add(camera.position, "x", -30, 30).name("X");
  cameraFolder.add(camera.position, "y", -30, 30).name("Y");
  cameraFolder.add(camera.position, "z", -30, 30).name("Z");

  return () => {
    gui.destroy();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    dispose();
  };
}
