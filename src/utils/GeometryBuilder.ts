import { Vector2, Vector3 } from "three";

/**
 * A vertex with all its attributes (position, normal, UV)
 */
export interface Vertex {
  position: Vector3;
  normal?: Vector3;
  uv?: Vector2;
}

/**
 * Helper class to build geometry by managing vertices, normals, UVs, and indices automatically.
 *
 * Usage:
 * ```typescript
 * const builder = new GeometryBuilder();
 *
 * // Add a quad
 * const v0 = builder.addVertex({ position: new Vector3(0, 0, 0), uv: new Vector2(0, 0) });
 * const v1 = builder.addVertex({ position: new Vector3(1, 0, 0), uv: new Vector2(1, 0) });
 * const v2 = builder.addVertex({ position: new Vector3(1, 1, 0), uv: new Vector2(1, 1) });
 * const v3 = builder.addVertex({ position: new Vector3(0, 1, 0), uv: new Vector2(0, 1) });
 *
 * builder.addQuad(v0, v1, v2, v3);
 *
 * // Get the arrays
 * const { positions, normals, uvs, indices } = builder.build();
 * ```
 */
export class GeometryBuilder {
  private vertices: Vertex[] = [];
  private triangleIndices: number[] = [];

  /**
   * Add a vertex and return its index
   */
  addVertex(vertex: Vertex): number {
    this.vertices.push(vertex);
    return this.vertices.length - 1;
  }

  /**
   * Add a triangle using vertex indices
   *
   * ```
   *     v1
   *    / \
   *   /   \
   *  /     \
   * v0 --- v2
   * ```
   */
  addTriangle(i0: number, i1: number, i2: number): void {
    this.triangleIndices.push(i0, i1, i2);
  }

  /**
   * Add a quad (2 triangles) using vertex indices
   * Vertices should be in counter-clockwise order
   *
   * ```
   * v0 -------- v1
   * |         / |
   * |       /   |
   * |     /     |
   * |   /       |
   * | /         |
   * v3 -------- v2
   *
   * Triangles: (v0, v1, v2) and (v2, v3, v0)
   * Total: 2 triangles, 4 vertices
   * ```
   *
   * Note: When vertices are non-planar, this creates a visible diagonal edge.
   * Consider using addSubdividedQuad() for smoother non-planar faces.
   */
  addQuad(i0: number, i1: number, i2: number, i3: number): void {
    this.addTriangle(i0, i1, i2);
    this.addTriangle(i2, i3, i0);
  }

  /**
   * Add a subdivided quad (4 triangles with center vertex)
   * Automatically creates the center vertex
   * Vertices should be in counter-clockwise order
   *
   * ```
   * v0 -------- v1
   * | \       / |
   * |   \   /   |
   * |     C     |  <- Center point (auto-created)
   * |   /   \   |
   * | /       \ |
   * v3 -------- v2
   *
   * Triangles: (v0,v1,C), (v1,v2,C), (v2,v3,C), (v3,v0,C)
   * Total: 4 triangles, 5 vertices
   * ```
   *
   * Benefits:
   * - Smoother appearance for non-planar faces
   * - Distributes distortion across 4 triangles instead of creating one harsh diagonal
   * - Better for arbitrary vertex positions
   *
   * @returns The index of the created center vertex
   */
  addSubdividedQuad(i0: number, i1: number, i2: number, i3: number): number {
    const v0 = this.vertices[i0];
    const v1 = this.vertices[i1];
    const v2 = this.vertices[i2];
    const v3 = this.vertices[i3];

    // Calculate center position (average of 4 corners)
    const centerPos = new Vector3()
      .add(v0.position)
      .add(v1.position)
      .add(v2.position)
      .add(v3.position)
      .multiplyScalar(0.25);

    // Calculate center UV if all corners have UVs
    let centerUV: Vector2 | undefined;
    if (v0.uv && v1.uv && v2.uv && v3.uv) {
      centerUV = new Vector2()
        .add(v0.uv)
        .add(v1.uv)
        .add(v2.uv)
        .add(v3.uv)
        .multiplyScalar(0.25);
    }

    // Calculate center normal (average of 4 corners, or calculate from geometry)
    let centerNormal: Vector3 | undefined;
    if (v0.normal && v1.normal && v2.normal && v3.normal) {
      centerNormal = new Vector3()
        .add(v0.normal)
        .add(v1.normal)
        .add(v2.normal)
        .add(v3.normal)
        .normalize();
    }

    // Add center vertex
    const centerIdx = this.addVertex({
      position: centerPos,
      normal: centerNormal,
      uv: centerUV,
    });

    // Add 4 triangles
    this.addTriangle(i0, i1, centerIdx);
    this.addTriangle(i1, i2, centerIdx);
    this.addTriangle(i2, i3, centerIdx);
    this.addTriangle(i3, i0, centerIdx);

    return centerIdx;
  }

  /**
   * Build and return the final arrays
   */
  build(): {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    indices: Uint16Array;
  } {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    let hasNormals = false;
    let hasUVs = false;

    // Build arrays from vertices
    for (const vertex of this.vertices) {
      // Position (always required)
      positions.push(vertex.position.x, vertex.position.y, vertex.position.z);

      // Normal (optional)
      if (vertex.normal) {
        normals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
        hasNormals = true;
      } else if (hasNormals) {
        // If some vertices have normals, all must have them (fill with default)
        normals.push(0, 1, 0);
      }

      // UV (optional)
      if (vertex.uv) {
        uvs.push(vertex.uv.x, vertex.uv.y);
        hasUVs = true;
      } else if (hasUVs) {
        // If some vertices have UVs, all must have them (fill with default)
        uvs.push(0, 0);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: hasNormals ? new Float32Array(normals) : undefined,
      uvs: hasUVs ? new Float32Array(uvs) : undefined,
      indices: new Uint16Array(this.triangleIndices),
    };
  }

  /**
   * Calculate and set normals for all vertices based on face normals
   * Call this after adding all geometry if you want auto-calculated normals
   */
  calculateNormals(): void {
    // Initialize all normals to zero
    const vertexNormals: Vector3[] = this.vertices.map(() => new Vector3());

    // Accumulate face normals for each vertex
    for (let i = 0; i < this.triangleIndices.length; i += 3) {
      const i0 = this.triangleIndices[i];
      const i1 = this.triangleIndices[i + 1];
      const i2 = this.triangleIndices[i + 2];

      const v0 = this.vertices[i0].position;
      const v1 = this.vertices[i1].position;
      const v2 = this.vertices[i2].position;

      // Calculate face normal
      const edge1 = new Vector3().subVectors(v1, v0);
      const edge2 = new Vector3().subVectors(v2, v0);
      const faceNormal = new Vector3().crossVectors(edge1, edge2);

      // Add to each vertex's normal
      vertexNormals[i0].add(faceNormal);
      vertexNormals[i1].add(faceNormal);
      vertexNormals[i2].add(faceNormal);
    }

    // Normalize all vertex normals
    for (let i = 0; i < this.vertices.length; i++) {
      this.vertices[i].normal = vertexNormals[i].normalize();
    }
  }

  /**
   * Get the current vertex count
   */
  getVertexCount(): number {
    return this.vertices.length;
  }

  /**
   * Clear all geometry
   */
  clear(): void {
    this.vertices = [];
    this.triangleIndices = [];
  }
}
