import { BufferGeometry, Float32BufferAttribute } from "three";

class StaircaseGeometry extends BufferGeometry {
  constructor(width = 2, stepHeight = 0.3, stepDepth = 0.5, numSteps = 10) {
    super();

    const vertices = [];
    const indices = [];

    // Generate vertices and indices for each step
    for (let i = 0; i < numSteps; i++) {
      const stepBottomY = i * stepHeight;
      const stepTopY = stepBottomY + stepHeight;
      const stepFrontZ = i * stepDepth;
      const stepBackZ = stepFrontZ + stepDepth;

      // Vertices for each step (8 vertices per step to cover tread and riser)
      vertices.push(
        // Bottom face of riser (front face)
        -width / 2, stepBottomY, stepFrontZ, // 0: Bottom-left-front
        width / 2, stepBottomY, stepFrontZ,  // 1: Bottom-right-front
        width / 2, stepTopY, stepFrontZ,     // 2: Top-right-front
        -width / 2, stepTopY, stepFrontZ,    // 3: Top-left-front

        // Top face of tread (horizontal step)
        -width / 2, stepTopY, stepFrontZ,    // 4: Top-left-front (repeated)
        width / 2, stepTopY, stepFrontZ,     // 5: Top-right-front (repeated)
        width / 2, stepTopY, stepBackZ,      // 6: Top-right-back
        -width / 2, stepTopY, stepBackZ      // 7: Top-left-back
      );

      // Indices for each step
      const baseIndex = i * 8;

      // Riser face (front face of each step)
      indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,  // First triangle for riser
        baseIndex, baseIndex + 2, baseIndex + 3   // Second triangle for riser
      );

      // Tread face (top horizontal surface of each step)
      indices.push(
        baseIndex + 4, baseIndex + 6, baseIndex + 5,  // First triangle for tread
        baseIndex + 4, baseIndex + 7, baseIndex + 6   // Second triangle for tread
      );
    }

    // Create BufferAttribute for vertices and indices
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.computeVertexNormals(); // Compute normals for proper lighting
  }
}

export { StaircaseGeometry };
