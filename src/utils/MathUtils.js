/**
 * Calculate the radius to achieve a spherical cap height.
 *   R = r / (1 - cos(thetaLength))
 */
export const radiusForSphereCapHeight = (height, thetaLength) => height / (1 - Math.cos(thetaLength));

/**
 * Calculate the radius to achieve a spherical cap width.
 *   R = w / (2 * sin(thetaLength))
 */
export const radiusForSphereCapWidth = (width, thetaLength) => width / (2 * Math.sin(thetaLength));

/**
 * Calculate the height of a spherical cap.
 *   h = R * (1 - cos(thetaLength))
 */
export const calculateSphereCapHeight = (radius, thetaLength) => radius * (1 - Math.cos(thetaLength));

/**
 * Calculate the width of a spherical cap.
 *   w = 2 * R * sin(thetaLength)
 */
export const calculateSphereCapWidth = (radius, thetaLength) => 2 * radius * Math.sin(thetaLength);
