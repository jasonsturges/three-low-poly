import { BufferGeometry, Float32BufferAttribute } from "three";

class BifurcatedStaircaseGeometry extends BufferGeometry {
  constructor(stepWidth = 2, stepHeight = 0.3, stepDepth = 0.6, numStepsCentral = 5, numStepsBranch = 5, branchAngle = Math.PI / 4) {
    super();

    const vertices = [];
    const indices = [];

    // Generate central flight of steps
    for (let i = 0; i < numStepsCentral; i++) {
      const yBottom = i * stepHeight;
      const yTop = yBottom + stepHeight;
      const zFront = i * stepDepth;
      const zBack = zFront + stepDepth;

      // Central flight of steps (8 vertices per step)
      vertices.push(
        // Vertical riser
        -stepWidth / 2, yBottom, zFront,  // Bottom-left
        stepWidth / 2, yBottom, zFront,   // Bottom-right
        stepWidth / 2, yTop, zFront,      // Top-right
        -stepWidth / 2, yTop, zFront,     // Top-left

        // Horizontal tread
        -stepWidth / 2, yTop, zFront,     // Top-left
        stepWidth / 2, yTop, zFront,      // Top-right
        stepWidth / 2, yTop, zBack,       // Back-right
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

    // Landing platform
    const landingY = numStepsCentral * stepHeight;
    const landingZ = numStepsCentral * stepDepth;
    const landingWidth = stepWidth * 2;

    vertices.push(
      // Landing platform (4 vertices)
      -landingWidth / 2, landingY, landingZ,            // Bottom-left
      landingWidth / 2, landingY, landingZ,            // Bottom-right
      landingWidth / 2, landingY, landingZ + stepDepth,// Top-right
      -landingWidth / 2, landingY, landingZ + stepDepth // Top-left
    );

    const landingBaseIndex = numStepsCentral * 8;
    indices.push(
      landingBaseIndex, landingBaseIndex + 1, landingBaseIndex + 2,  // First triangle for landing
      landingBaseIndex, landingBaseIndex + 2, landingBaseIndex + 3   // Second triangle for landing
    );

    // Generate branching flights (left and right)
    for (let j = 0; j < 2; j++) {
      const direction = j === 0 ? 1 : -1; // Left or right branch

      for (let i = 0; i < numStepsBranch; i++) {
        const yBottom = landingY + i * stepHeight;
        const yTop = yBottom + stepHeight;

        // Calculate positions for the branching steps
        const xStart = direction * (landingWidth / 4);
        const zStart = landingZ + stepDepth;

        const xOffset = i * stepDepth * Math.cos(branchAngle);
        const zOffset = i * stepDepth * Math.sin(branchAngle);

        const xFrontLeft = xStart + direction * xOffset - (stepWidth / 2) * Math.cos(branchAngle);
        const xFrontRight = xStart + direction * xOffset + (stepWidth / 2) * Math.cos(branchAngle);
        const zFront = zStart + zOffset;
        const xBackLeft = xFrontLeft + direction * stepDepth * Math.cos(branchAngle);
        const xBackRight = xFrontRight + direction * stepDepth * Math.cos(branchAngle);
        const zBack = zFront + stepDepth * Math.sin(branchAngle);

        // Branch flight of steps (8 vertices per step)
        vertices.push(
          // Vertical riser
          xFrontLeft, yBottom, zFront,  // Bottom-left
          xFrontRight, yBottom, zFront, // Bottom-right
          xFrontRight, yTop, zFront,    // Top-right
          xFrontLeft, yTop, zFront,     // Top-left

          // Horizontal tread
          xFrontLeft, yTop, zFront,     // Top-left
          xFrontRight, yTop, zFront,    // Top-right
          xBackRight, yTop, zBack,      // Back-right
          xBackLeft, yTop, zBack        // Back-left
        );

        const baseIndex = landingBaseIndex + 4 + j * numStepsBranch * 8 + i * 8;
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
    }

    // Create BufferAttribute for vertices and indices
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.computeVertexNormals(); // Compute normals for proper lighting
  }
}

export { BifurcatedStaircaseGeometry };
