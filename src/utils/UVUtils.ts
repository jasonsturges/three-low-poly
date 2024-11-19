/**
 * Planar UV Mapping
 * Projects UVs onto the geometry from a single direction (like shining a projector onto a surface).
 *
 * Example:
 * ```
 * const vertices = [
 *   [-1, -1, 1],
 *   [1, -1, 1],
 *   [-1, 1, 1],
 *   [1, 1, 1],
 * ];
 *
 * const uvs = planarUVMapping(vertices, 'z'); // Project onto the Z-axis
 */
export function planarUVMapping(vertices: [number, number, number][], axis: 'x' | 'y' | 'z'): [number, number][] {
  return vertices.map(([x, y, z]) => {
    switch (axis) {
      case 'x': return [y, z]; // Use Y and Z for X-axis projection
      case 'y': return [x, z]; // Use X and Z for Y-axis projection
      case 'z': return [x, y]; // Use X and Y for Z-axis projection
      default: throw new Error(`Invalid axis: ${axis}`);
    }
  });
}

/**
 * Cubic UV Mapping
 * Applies a texture by projecting UVs along each face of a cube.
 *
 * Example usage:
 * ```
 * const cubeVertices = [
 *   [-1, -1, 1],
 *   [1, -1, 1],
 *   [-1, 1, 1],
 *   [1, 1, 1],
 * ];
 *
 * const cubeUVs = cubicUVMappingBatch(cubeVertices);
 * ```
 */
export function cubicUVMapping(vertex: [number, number, number]): [number, number] {
  const [x, y, z] = vertex;
  const absX = Math.abs(x), absY = Math.abs(y), absZ = Math.abs(z);

  if (absX >= absY && absX >= absZ) {        // X face
    return [z > 0 ? z : -z, y];
  } else if (absY >= absX && absY >= absZ) { // Y face
    return [x, z > 0 ? z : -z];
  } else {                                   // Z face
    return [x, y];
  }
}

export function cubicUVMappingBatch(vertices: [number, number, number][]): [number, number][] {
  return vertices.map((vertex) => cubicUVMapping(vertex));
}

/**
 * Spherical UV Mapping
 * Wraps UVs around the geometry as if the texture were projected from a globe.
 *
 * Example usage:
 * ```
 * const sphereVertices = [
 *   [1, 0, 0],
 *   [0, 1, 0],
 *   [0, 0, 1],
 * ];
 *
 * const sphereUVs = sphericalUVMapping(sphereVertices);
 * ```
 */
export function sphericalUVMapping(vertices: [number, number, number][]): [number, number][] {
  return vertices.map(([x, y, z]) => {
    const theta = Math.atan2(z, x);                                  // Angle around the Y-axis
    const phi = Math.acos(y / Math.sqrt(x ** 2 + y ** 2 + z ** 2));  // Angle from the Y-axis
    const u = (theta / (2 * Math.PI)) + 0.5;                         // Map theta to [0, 1]
    const v = 1 - (phi / Math.PI);                                   // Map phi to [0, 1]
    return [u, v];
  });
}

/**
 * Cylindrical UV Mapping
 * Projects UV coordinates onto the surface as though the texture is
 * wrapped around the cylinder's height and circumference.
 *
 * Example usage:
 * ```
 * const cylinderVertices = [
 *   [1, 0, 0],   // Vertex on the "equator"
 *   [0, 1, 0],   // Vertex on the top
 *   [0, -1, 1],  // Vertex on the bottom
 *   [-1, 0, 0],  // Opposite side of the equator
 * ];
 *
 * const cylinderUVs = cylindricalUVMapping(cylinderVertices);
 * ```
 */
export function cylindricalUVMapping(vertices: [number, number, number][]): [number, number][] {
  return vertices.map(([x, y, z]) => {
    const theta = Math.atan2(z, x);           // Angle around the Y-axis (circumference)
    const u = (theta / (2 * Math.PI)) + 0.5;  // Map theta to [0, 1]
    const v = y;                              // Use Y-axis as the vertical component (height)
    return [u, v];
  });
}

/**
 * Polar UV Mapping
 * Map textures onto circular or radial geometries, such as discs or dome-like structures.
 * Maps the radial distance from the center of the geometry to the v coordinate
 * and the angular position to the u coordinate.
 *
 * const discVertices = [
 *   [1, 0, 0],   // Vertex at (1, 0, 0)
 *   [0, 0, 1],   // Vertex at (0, 0, 1)
 *   [-1, 0, 0],  // Vertex at (-1, 0, 0)
 *   [0, 0, -1],  // Vertex at (0, 0, -1)
 * ];
 *
 * const polarUVs = polarUVMapping(discVertices);
 */
export function polarUVMapping(vertices: [number, number, number][]): [number, number][] {
  return vertices.map(([x, y, z]) => {
    const radius = Math.sqrt(x ** 2 + z ** 2); // Distance from the Y-axis (polar radius)
    const theta = Math.atan2(z, x);            // Angle around the Y-axis (polar angle)

    const u = (theta / (2 * Math.PI)) + 0.5;   // Map angle to [0, 1]
    const v = radius;                          // Use radial distance for v
    return [u, v];
  });
}

/**
 * Generic Normalization Function
 * This function will normalize 2D UV coordinates based on given bounds.
 *
 * Full pipeline:
 * - Compute UVs
 * - Calculate bounds
 * - Normalize UVs
 *
 * Example usage:
 * ```
 * const planarMapping = (vertex: [number, number, number]) => [vertex[0], vertex[1]];
 * const uvs = vertices.map(mappingFunction);
 * const { minBounds, maxBounds } = calculateUVBounds(uvs);
 * const normalizedUVs = normalizeUVBatch(uvs, minBounds, maxBounds);
 * ```
 */
export function normalizeUV(
  uv: [number, number],
  minU: number,
  maxU: number,
  minV: number,
  maxV: number
): [number, number] {
  return [
    (uv[0] - minU) / (maxU - minU),
    (uv[1] - minV) / (maxV - minV),
  ];
}

/**
 * Batch Normalization for Multiple UVs
 * If you have multiple UVs, normalize them all based on the overall min/max bounds.
 */
export function normalizeUVBatch(
  uvs: [number, number][],
  minBounds: [number, number],
  maxBounds: [number, number]
): [number, number][] {
  const [minU, minV] = minBounds;
  const [maxU, maxV] = maxBounds;

  return uvs.map((uv) => normalizeUV(uv, minU, maxU, minV, maxV));
}

/**
 * Finding Bounds for a List of UVs
 * calculate the min and max values dynamically.
 */
export function calculateUVBounds(uvs: [number, number][]): { minBounds: [number, number]; maxBounds: [number, number] } {
  const minU = Math.min(...uvs.map((uv) => uv[0]));
  const maxU = Math.max(...uvs.map((uv) => uv[0]));
  const minV = Math.min(...uvs.map((uv) => uv[1]));
  const maxV = Math.max(...uvs.map((uv) => uv[1]));

  return {
    minBounds: [minU, minV],
    maxBounds: [maxU, maxV],
  };
}
