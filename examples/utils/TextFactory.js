import * as THREE from "three";
import { Direction } from "../../src/index.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import helvetikerFont from "../assets/helvetiker-regular.json";

const fontLoader = new FontLoader();
const font = fontLoader.parse(helvetikerFont);

export function createText(
  text,
  {
    size = 1, //
    depth = 0.1,
    curveSegments = 12,
    color = 0xffffff,
    direction = Direction.FORWARD,
    x = 0,
    y = 0,
    z = 0,
  } = {},
) {
  const textGeometry = new TextGeometry(text, {
    font: font,
    size: size,
    depth: depth,
    curveSegments: curveSegments,
  });
  const textMaterial = new THREE.MeshBasicMaterial({ color: color });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(x, y, z);
  textMesh.lookAt(textMesh.position.clone().add(direction));

  return textMesh;
}

export function createTextShape(
  text,
  {
    size = 1, //
    color = 0xffffff,
    direction = Direction.FORWARD,
    x = 0,
    y = 0,
    z = 0,
  } = {},
) {
  // Generate shapes from the text
  const shapes = font.generateShapes(text, size);

  // Create the geometry from the shapes
  const geometry = new THREE.ShapeGeometry(shapes);

  // Center the geometry by calculating its bounding box
  geometry.computeBoundingBox();
  if (geometry.boundingBox) {
    const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    geometry.translate(xMid, 0, 0);
  }

  // Create the material and mesh
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
  });
  const textMesh = new THREE.Mesh(geometry, material);
  textMesh.position.set(x, y, z);
  textMesh.lookAt(textMesh.position.clone().add(direction));

  return textMesh;
}

/**
 * Wrap a given text as a sprite billboard.
 */
export function createTextSprite(
  text,
  {
    font = "Arial", //
    weight = "normal",
    size = 96,
    scale = 1,
    color = "#ffffff",
    x = 0,
    y = 0,
    z = 0,
  } = {},
) {
  // Render text to a canvas to create a texture
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${weight} ${size}px ${font}`;

  // Measure the text dimensions
  const textMetrics = context.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = 100; // Height based on the font size set (in this case, 100px)

  // Resize the canvas to fit the text
  canvas.width = textWidth;
  canvas.height = textHeight;

  // Set the font again after resizing the canvas
  context.font = `${weight} ${size}px ${font}`;
  context.fillStyle = `${color}`;
  context.textBaseline = "top";
  context.fillText(text, 0, 0);

  // Create texture from the canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  // Create sprite material
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });

  // Create the sprite
  const sprite = new THREE.Sprite(spriteMaterial);

  // Adjust scale to match the text dimensions
  const aspectRatio = canvas.width / canvas.height;
  sprite.scale.set(scale * aspectRatio, scale, 1);

  // Set position of the sprite
  sprite.position.set(x, y, z);

  return sprite;
}

export const TextFactory = {
  createText,
  createTextShape,
  createTextSprite,
}
