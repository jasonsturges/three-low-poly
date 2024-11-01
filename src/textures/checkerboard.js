import { DataTexture, NearestFilter, RepeatWrapping, RGBAFormat, UnsignedByteType } from "three";

/**
 * Create a checkerboard texture
 * @param size
 * @returns {DataTexture}
 *
 * @example
 * const material = new MeshStandardMaterial();
 * material.map = createCheckerboardTexture(8);
 */
export const checkerboardTexture = (size) => {
  const data = new Uint8Array(4 * size * size);
  for (let i = 0; i < size * size; i++) {
    const stride = i * 4;
    const color = (i % size ^ Math.floor(i / size)) & 1 ? 255 : 0;
    data[stride] = color;      // red
    data[stride + 1] = color;  // green
    data[stride + 2] = color;  // blue
    data[stride + 3] = 255;    // alpha
  }

  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;

  return texture;
};
