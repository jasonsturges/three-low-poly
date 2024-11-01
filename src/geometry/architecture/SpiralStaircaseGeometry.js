import { BufferGeometry, Float32BufferAttribute } from "three";

class SpiralStaircaseGeometry extends BufferGeometry {
  constructor(stepWidth = 1, stepDepth = 0.4, stepHeight = 0.2, numSteps = 20, radius = 2, angleIncrement = Math.PI / 8) {
    super();

    const vertices = [];
    const indices = [];
    let currentAngle = 0;

    // Generate vertices and indices for each step
    for (let i = 0; i < numSteps; i++) {
      // Calculate the center position of the step based on the angle and radius
      const xCenter = radius * Math.cos(currentAngle);
      const zCenter = radius * Math.sin(currentAngle);
      const yBottom = i * stepHeight;
      const yTop = yBottom + stepHeight;

      // Define the four corners of the vertical riser part of the current step
      vertices.push(
        // Front face (vertical riser)
        xCenter - (stepWidth / 2) * Math.cos(currentAngle), yBottom, zCenter - (stepWidth / 2) * Math.sin(currentAngle),  // Bottom-left
        xCenter + (stepWidth / 2) * Math.cos(currentAngle), yBottom, zCenter + (stepWidth / 2) * Math.sin(currentAngle),  // Bottom-right
        xCenter + (stepWidth / 2) * Math.cos(currentAngle), yTop, zCenter + (stepWidth / 2) * Math.sin(currentAngle),     // Top-right
        xCenter - (stepWidth / 2) * Math.cos(currentAngle), yTop, zCenter - (stepWidth / 2) * Math.sin(currentAngle)      // Top-left
      );

      // Define the four corners of the horizontal tread part of the current step
      vertices.push(
        // Top face (horizontal tread)
        xCenter - (stepWidth / 2) * Math.cos(currentAngle), yTop, zCenter - (stepWidth / 2) * Math.sin(currentAngle),    // Top-left-front
        xCenter + (stepWidth / 2) * Math.cos(currentAngle), yTop, zCenter + (stepWidth / 2) * Math.sin(currentAngle),    // Top-right-front
        xCenter + (stepWidth / 2) * Math.cos(currentAngle) - stepDepth * Math.sin(currentAngle), yTop, zCenter + (stepWidth / 2) * Math.sin(currentAngle) + stepDepth * Math.cos(currentAngle),  // Back-right
        xCenter - (stepWidth / 2) * Math.cos(currentAngle) - stepDepth * Math.sin(currentAngle), yTop, zCenter - (stepWidth / 2) * Math.sin(currentAngle) + stepDepth * Math.cos(currentAngle)   // Back-left
      );

      // Indices for the riser (vertical face of each step)
      const baseIndex = i * 8; // 8 vertices per step (4 for riser, 4 for tread)
      indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,  // First triangle for riser
        baseIndex, baseIndex + 2, baseIndex + 3   // Second triangle for riser
      );

      // Indices for the tread (horizontal face of each step)
      indices.push(
        baseIndex + 4, baseIndex + 5, baseIndex + 6,  // First triangle for tread
        baseIndex + 4, baseIndex + 6, baseIndex + 7   // Second triangle for tread
      );

      // Increment the angle for the next step
      currentAngle += angleIncrement;
    }

    // Create BufferAttribute for vertices and indices
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.computeVertexNormals(); // Compute normals for proper lighting
  }
}

export { SpiralStaircaseGeometry };
