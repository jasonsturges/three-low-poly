import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Bone Geometry, a simple bone shape
 * @extends THREE.BufferGeometry
 *
 * @example
 * // Create a bone
 * const boneGeometry = new Bone();
 * const boneMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
 * const bone = new THREE.Mesh(boneGeometry, boneMaterial);
 * scene.add(bone);
 */
export class Bone extends THREE.BufferGeometry {
  constructor(radiusTop = 0.1, radiusBottom = 0.1, height = 0.4, radialSegments = 8) {
    super();

    // Create the cylinder (shaft of the bone)
    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop * 0.6, radiusBottom * 0.6, height, radialSegments);
    cylinderGeometry.translate(0, 0, 0);

    // Create the spheres (ends of the bone)
    const sphereGeometry = new THREE.SphereGeometry(radiusTop, radialSegments, radialSegments);
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
    this.copy(
      BufferGeometryUtils.mergeGeometries([cylinderGeometry, topSphere1, topSphere2, bottomSphere1, bottomSphere2], true),
    );
  }
}
