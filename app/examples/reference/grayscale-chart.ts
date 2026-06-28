import { Color, LinearSRGBColorSpace, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Sprite } from "three";
import GUI from "lil-gui";
import { createScene } from "../../framework/createScene";
import { createTextSprite } from "../../framework/createTextSprite";

export const meta = { title: "Grayscale Chart" };

export default function (container: HTMLElement) {
  const { scene, camera, controls, renderer, dispose } = createScene(container, {
    background: 0x333333,
    cameraPosition: [0, 0, 35],
  });
  controls.enableDamping = true;
  renderer.outputColorSpace = SRGBColorSpace;

  const grayscaleSteps = 11;
  const swatchWidth = 4;
  const swatchHeight = 6;
  const swatchSpacing = 0.2;
  const grayscaleMeshes: Mesh[] = [];
  const grayscaleLabels: Sprite[] = [];

  for (let i = 0; i < grayscaleSteps; i++) {
    const value = i / (grayscaleSteps - 1);
    const color = new Color(value, value, value);
    const xPos = (i - (grayscaleSteps - 1) / 2) * (swatchWidth + swatchSpacing);
    const swatch = new Mesh(new PlaneGeometry(swatchWidth, swatchHeight), new MeshBasicMaterial({ color }));
    swatch.position.set(xPos, 8, 0);
    scene.add(swatch);
    grayscaleMeshes.push(swatch);

    const percentage = Math.round(value * 100);
    const label = createTextSprite(`${percentage}%`, { size: 32, x: xPos, y: 4, z: 0 });
    scene.add(label);
    grayscaleLabels.push(label);

    const hexLabel = createTextSprite(`#${color.getHexString()}`, { size: 24, x: xPos, y: 3, z: 0 });
    scene.add(hexLabel);
    grayscaleLabels.push(hexLabel);
  }

  const grayscaleTitle = createTextSprite("Grayscale Step Wedge", { size: 48, x: 0, y: 12, z: 0 });
  scene.add(grayscaleTitle);
  grayscaleLabels.push(grayscaleTitle);

  const colorCheckerColors = [
    { name: "Dark Skin", color: 0x735244 },
    { name: "Light Skin", color: 0xc29682 },
    { name: "Blue Sky", color: 0x627a9d },
    { name: "Foliage", color: 0x576c43 },
    { name: "Blue Flower", color: 0x8580b1 },
    { name: "Bluish Green", color: 0x67bdaa },
    { name: "Orange", color: 0xd67e2c },
    { name: "Purplish Blue", color: 0x505ba6 },
    { name: "Moderate Red", color: 0xc15a63 },
    { name: "Purple", color: 0x5e3c6c },
    { name: "Yellow Green", color: 0x9dbc40 },
    { name: "Orange Yellow", color: 0xeac51f },
    { name: "Blue", color: 0x2d5da1 },
    { name: "Green", color: 0x5a9a69 },
    { name: "Red", color: 0xb83b39 },
    { name: "Yellow", color: 0xeec822 },
    { name: "Magenta", color: 0xc773ab },
    { name: "Cyan", color: 0x0088a8 },
  ];

  const colorCheckerMeshes: Mesh[] = [];
  const colorCheckerLabels: Sprite[] = [];
  const cols = 6;
  const colorSwatchWidth = 6;
  const colorSwatchHeight = 4;
  const colorSwatchSpacing = 0.5;

  colorCheckerColors.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const xPos = (col - (cols - 1) / 2) * (colorSwatchWidth + colorSwatchSpacing);
    const yPos = -4 - row * (colorSwatchHeight + colorSwatchSpacing + 1.5);
    const swatch = new Mesh(
      new PlaneGeometry(colorSwatchWidth, colorSwatchHeight),
      new MeshBasicMaterial({ color: item.color }),
    );
    swatch.position.set(xPos, yPos, 0);
    scene.add(swatch);
    colorCheckerMeshes.push(swatch);

    const nameLabel = createTextSprite(item.name, { size: 24, x: xPos, y: yPos - 2.8, z: 0 });
    scene.add(nameLabel);
    colorCheckerLabels.push(nameLabel);
  });

  const colorCheckerTitle = createTextSprite("Color Checker Reference", { size: 48, x: 0, y: -1, z: 0 });
  scene.add(colorCheckerTitle);
  colorCheckerLabels.push(colorCheckerTitle);

  const settings = { colorSpace: "sRGB" as "sRGB" | "Linear-sRGB", showLabels: true };
  const colorSpaceTypes = { sRGB: SRGBColorSpace, "Linear-sRGB": LinearSRGBColorSpace };

  const updateColorSpace = () => {
    renderer.outputColorSpace = colorSpaceTypes[settings.colorSpace];
    [...grayscaleMeshes, ...colorCheckerMeshes].forEach((mesh) => {
      (mesh.material as MeshBasicMaterial).needsUpdate = true;
    });
  };

  const updateLabels = () => {
    [...grayscaleLabels, ...colorCheckerLabels].forEach((label) => {
      label.visible = settings.showLabels;
    });
  };

  const gui = new GUI();
  const colorSpaceFolder = gui.addFolder("Color Space");
  colorSpaceFolder.add(settings, "colorSpace", Object.keys(colorSpaceTypes)).name("Output Color Space").onChange(updateColorSpace);
  colorSpaceFolder.open();

  const displayFolder = gui.addFolder("Display Options");
  displayFolder.add(settings, "showLabels").name("Show Labels").onChange(updateLabels);
  displayFolder.open();

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.add(camera.position, "x", -50, 50).name("X");
  cameraFolder.add(camera.position, "y", -50, 50).name("Y");
  cameraFolder.add(camera.position, "z", 10, 100).name("Z");

  return () => {
    gui.destroy();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
      if (object instanceof Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    dispose();
  };
}