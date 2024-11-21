/**
 * Calculate the radius to achieve a spherical cap height.
 *   R = r / (1 - cos(thetaLength))
 */
export const radiusFromCapHeight = (height: number, thetaLength: number) => height / (1 - Math.cos(thetaLength));

/**
 * Calculate the radius to achieve a spherical cap width.
 *   R = w / (2 * sin(thetaLength))
 */
export const radiusFromCapWidth = (width: number, thetaLength: number) => width / (2 * Math.sin(thetaLength));

/**
 * Calculate the height of a spherical cap.
 *   h = R * (1 - cos(thetaLength))
 */
export const capHeightFromRadius = (radius: number, thetaLength: number) => radius * (1 - Math.cos(thetaLength));

/**
 * Calculate the width of a spherical cap.
 *   w = 2 * R * sin(thetaLength)
 */
export const capWidthFromRadius = (radius: number, thetaLength: number) => 2 * radius * Math.sin(thetaLength);

/**
 * Calculate the thetaLength to achieve a specific hole radius in a sphere.
 *   thetaLength = asin(w / (2 * R))
 *
 * Returns the thetaLength in radians.
 *
 * Example usage:
 * ```
 * const sphereRadius = 5; // Radius of the sphere
 * const holeRadius = 1;   // Desired radius of the hole at the top
 * const thetaLength = thetaLengthForRadius(sphereRadius, holeRadius);
 * ```
 */
export const thetaLengthForRadius = (sphereRadius: number, holeRadius: number) => {
  const holeDiameter = 2 * holeRadius; // Hole width
  return Math.asin(holeDiameter / (2 * sphereRadius));
};

/**
 * Convert spherical coordinates to Cartesian coordinates.
 * @param {number} radius - The radius of the sphere.
 * @param {number} theta - The azimuthal angle in radians (from the x-axis in the x-y plane).
 * @param {number} phi - The polar angle in radians (from the positive z-axis).
 * @returns {{x: number, y: number, z: number}} The Cartesian coordinates.
 */
export const sphericalToCartesian = (radius: number, theta: number, phi: number) => {
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  };
};

/**
 * Convert Cartesian coordinates to spherical coordinates.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {number} z - The z-coordinate.
 * @returns {{radius: number, theta: number, phi: number}} The spherical coordinates.
 */
export const cartesianToSpherical = (x: number, y: number, z: number) => {
  const radius = Math.sqrt(x * x + y * y + z * z);
  const theta = Math.atan2(y, x); // Azimuthal angle
  const phi = Math.acos(z / radius); // Polar angle
  return { radius, theta, phi };
};
