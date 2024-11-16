import { BufferGeometry, CylinderGeometry, SphereGeometry } from "three";
import { mergeBufferGeometries } from "three-stdlib";

/**
 * Bone Geometry, a simple bone shape
 * @extends BufferGeometry
 *
 * @example
 * // Create a bone
 * const boneGeometry = new BoneGeometry();
 * const boneMaterial = new MeshStandardMaterial({ color: 0xffffff });
 * const bone = new Mesh(boneGeometry, boneMaterial);
 * scene.add(bone);
 */
class BoneGeometry extends BufferGeometry {
  constructor(radiusTop = 0.1, radiusBottom = 0.1, height = 0.4, radialSegments = 8) {
    super();

    // Create the cylinder (shaft of the bone)
    const cylinderGeometry = new CylinderGeometry(radiusTop * 0.6, radiusBottom * 0.6, height, radialSegments);
    cylinderGeometry.translate(0, 0, 0);

    // Create the spheres (ends of the bone)
    const sphereGeometry = new SphereGeometry(radiusTop, radialSegments, radialSegments);
    const topSphere1 = sphereGeometry.clone();
    const topSphere2 = sphereGeometry.clone();
    const bottomSphere1 = sphereGeometry.clone();
    const bottomSphere2 = sphereGeometry.clone();

    // Position the spheres at each end of the cylinder
    topSphere1.translate(0, height / 2 + radiusTop * 0.6, -radiusTop * 0.6);
    topSphere2.translate(0, height / 2 + radiusTop * 0.6, radiusTop * 0.6);
    bottomSphere1.translate(0, -height / 2 - radiusBottom * 0.6, -radiusBottom * 0.6);
    bottomSphere2.translate(0, -height / 2 - radiusBottom * 0.6, radiusBottom * 0.6);

    // Merge the parts
    this.copy(mergeBufferGeometries([cylinderGeometry, topSphere1, topSphere2, bottomSphere1, bottomSphere2], false) as BufferGeometry);
  }
}

export { BoneGeometry };
