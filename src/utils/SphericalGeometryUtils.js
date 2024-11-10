/**
 * Calculate the radius to achieve a spherical cap height.
 *   R = r / (1 - cos(thetaLength))
 */
export const radiusFromCapHeight = (height, thetaLength) => height / (1 - Math.cos(thetaLength));

/**
 * Calculate the radius to achieve a spherical cap width.
 *   R = w / (2 * sin(thetaLength))
 */
export const radiusFromCapWidth = (width, thetaLength) => width / (2 * Math.sin(thetaLength));

/**
 * Calculate the height of a spherical cap.
 *   h = R * (1 - cos(thetaLength))
 */
export const capHeightFromRadius = (radius, thetaLength) => radius * (1 - Math.cos(thetaLength));

/**
 * Calculate the width of a spherical cap.
 *   w = 2 * R * sin(thetaLength)
 */
export const capWidthFromRadius = (radius, thetaLength) => 2 * radius * Math.sin(thetaLength);


/**
 * Convert spherical coordinates to Cartesian coordinates.
 * @param {number} radius - The radius of the sphere.
 * @param {number} theta - The azimuthal angle in radians (from the x-axis in the x-y plane).
 * @param {number} phi - The polar angle in radians (from the positive z-axis).
 * @returns {{x: number, y: number, z: number}} The Cartesian coordinates.
 */
export const sphericalToCartesian = (radius, theta, phi) => {
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi)
  };
};

/**
 * Convert Cartesian coordinates to spherical coordinates.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {number} z - The z-coordinate.
 * @returns {{radius: number, theta: number, phi: number}} The spherical coordinates.
 */
export const cartesianToSpherical = (x, y, z) => {
  const radius = Math.sqrt(x * x + y * y + z * z);
  const theta = Math.atan2(y, x); // Azimuthal angle
  const phi = Math.acos(z / radius); // Polar angle
  return { radius, theta, phi };
};
