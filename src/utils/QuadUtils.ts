/**
 * Generates vertices for two triangles based upon a quad.
 *
 * Example usages:
 *
 * Create a face of a box:
 * ```
 * const frontQuad = createQuad(
 *   [-1, -1,  1], // Bottom-left
 *   [ 1, -1,  1], // Bottom-right
 *   [-1,  1,  1], // Top-left
 *   [ 1,  1,  1], // Top-right
 *   [ 0,  0,  1]  // Normal (facing forward)
 * );
 * ```
 *
 * Assembling a box:
 * ```
 * const vertices = [
 *   ...createQuad([-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [0, 0, 1]),       // Front face
 *   ...createQuad([1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1], [0, 0, -1]),  // Back face
 *   ...createQuad([-1, 1, 1], [1, 1, 1], [-1, 1, -1], [1, 1, -1], [0, 1, 0]),       // Top face
 *   ...createQuad([-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [0, -1, 0]),  // Bottom face
 *   ...createQuad([-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [-1, 0, 0]),  // Left face
 *   ...createQuad([1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1], [1, 0, 0]),       // Right face
 * ];
 * ```
 *
 * Generating Buffer Geometry:
 * ```
 * const positions = [];
 * const normals = [];
 * const uvs = [];
 *
 * for (const vertex of vertices) {
 *   positions.push(...vertex.pos);
 *   normals.push(...vertex.norm);
 *   uvs.push(...vertex.uv);
 * }
 *
 * const geometry = new THREE.BufferGeometry();
 * geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
 * geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
 * geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
 * ```
 */
export function createQuad(
  p1: [number, number, number], //
  p2: [number, number, number],
  p3: [number, number, number],
  p4: [number, number, number],
  normal?: [number, number, number],
  uv1: [number, number] = [0, 0],
  uv2: [number, number] = [1, 0],
  uv3: [number, number] = [0, 1],
  uv4: [number, number] = [1, 1],
) {
  const normalVector = normal || calculateNormal(p1, p2, p3);

  return [
    // Triangle 1
    { pos: p1, norm: normalVector, uv: uv1 },
    { pos: p2, norm: normalVector, uv: uv2 },
    { pos: p4, norm: normalVector, uv: uv4 },
    // Triangle 2
    { pos: p1, norm: normalVector, uv: uv1 },
    { pos: p4, norm: normalVector, uv: uv4 },
    { pos: p3, norm: normalVector, uv: uv3 },
  ];
}

/**
 * Compute normal based on the quad’s vertices (using the cross product of two edges).
 */
export function calculateNormal(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
): [number, number, number] {
  // Edge vectors
  const u: [number, number, number] = [
    p2[0] - p1[0],
    p2[1] - p1[1],
    p2[2] - p1[2],
  ];
  const v: [number, number, number] = [
    p3[0] - p1[0],
    p3[1] - p1[1],
    p3[2] - p1[2],
  ];

  // Cross product to calculate normal
  const normal: [number, number, number] = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];

  // Normalize the normal vector
  const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
  return normal.map((val) => val / length) as [number, number, number];
}
