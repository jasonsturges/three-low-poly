import { BufferGeometry, Float32BufferAttribute } from "three";

class LShapedStaircaseGeometry extends BufferGeometry {
  constructor(stepWidth = 2, stepHeight = 0.3, stepDepth = 0.5, numStepsPerFlight = 5, landingDepth = 2) {
    super();

    const vertices = [];
    const indices = [];

    // Generate first flight of steps
    for (let i = 0; i < numStepsPerFlight; i++) {
      const yBottom = i * stepHeight;
      const yTop = yBottom + stepHeight;
      const zFront = i * stepDepth;
      const zBack = zFront + stepDepth;

      // First flight of steps (4 vertices per step, 8 vertices per flight)
      vertices.push(
        // Vertical riser
        -stepWidth / 2, yBottom, zFront,  // Bottom-left
        stepWidth / 2, yBottom, zFront,  // Bottom-right
        stepWidth / 2, yTop, zFront,     // Top-right
        -stepWidth / 2, yTop, zFront,     // Top-left

        // Horizontal tread
        -stepWidth / 2, yTop, zFront,     // Top-left
        stepWidth / 2, yTop, zFront,     // Top-right
        stepWidth / 2, yTop, zBack,      // Back-right
        -stepWidth / 2, yTop, zBack       // Back-left
      );

      const baseIndex = i * 8;
      // Indices for riser
      indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex, baseIndex + 2, baseIndex + 3
      );

      // Indices for tread
      indices.push(
        baseIndex + 4, baseIndex + 5, baseIndex + 6,
        baseIndex + 4, baseIndex + 6, baseIndex + 7
      );
    }

    // Add landing platform
    const landingY = numStepsPerFlight * stepHeight;
    const landingZ = numStepsPerFlight * stepDepth;

    vertices.push(
      // Landing platform (4 vertices)
      -stepWidth / 2, landingY, landingZ,                      // Bottom-left
      stepWidth / 2, landingY, landingZ,                      // Bottom-right
      stepWidth / 2, landingY, landingZ + landingDepth,       // Top-right
      -stepWidth / 2, landingY, landingZ + landingDepth        // Top-left
    );

    const landingBaseIndex = numStepsPerFlight * 8;
    indices.push(
      landingBaseIndex, landingBaseIndex + 1, landingBaseIndex + 2,  // First triangle for landing
      landingBaseIndex, landingBaseIndex + 2, landingBaseIndex + 3   // Second triangle for landing
    );

    // Generate second flight of steps (turn 90 degrees)
    for (let i = 0; i < numStepsPerFlight; i++) {
      const yBottom = landingY + i * stepHeight;
      const yTop = yBottom + stepHeight;
      const xFront = -stepWidth / 2 - i * stepDepth;
      const xBack = xFront - stepDepth;

      // Second flight of steps (4 vertices per step, 8 vertices per flight)
      vertices.push(
        // Vertical riser
        xFront, yBottom, landingZ + landingDepth,  // Bottom-left
        xFront, yBottom, landingZ + landingDepth - stepWidth,  // Bottom-right
        xFront, yTop, landingZ + landingDepth - stepWidth,     // Top-right
        xFront, yTop, landingZ + landingDepth,                 // Top-left

        // Horizontal tread
        xFront, yTop, landingZ + landingDepth,                 // Top-left
        xFront, yTop, landingZ + landingDepth - stepWidth,     // Top-right
        xBack, yTop, landingZ + landingDepth - stepWidth,      // Back-right
        xBack, yTop, landingZ + landingDepth                   // Back-left
      );

      const baseIndex = landingBaseIndex + 4 + i * 8;
      // Indices for riser
      indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex, baseIndex + 2, baseIndex + 3
      );

      // Indices for tread
      indices.push(
        baseIndex + 4, baseIndex + 5, baseIndex + 6,
        baseIndex + 4, baseIndex + 6, baseIndex + 7
      );
    }

    // Create BufferAttribute for vertices and indices
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.computeVertexNormals(); // Compute normals for proper lighting
  }
}

export { LShapedStaircaseGeometry };
