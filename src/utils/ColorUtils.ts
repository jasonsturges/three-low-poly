//------------------------------
//  Hex
//------------------------------

/**
 * Convert hex color code color string to RGB array
 */
export function parseHexCode(hex: string): [number, number, number] {
  const bigint = parseInt(hex.slice(1), 16);
  return [
    (bigint >> 16) & 255,  // r
    (bigint >> 8) & 255,   // g
    bigint & 255,          // b
  ];
}

export function hexToHsl(hex: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

/**
 * Convert hexadecimal literal numeric color value to RGB array
 * @param hex
 */
export function hexToRgb(hex: number): [number, number, number] {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;

  return [r, g, b];
}

//------------------------------
//  HSL
//------------------------------

/**
 * Example usage:
 * ```
 * const h = 200; // Hue
 * const s = 75;  // Saturation
 * const l = 50;  // Lightness
 *
 * const [ r, g, b ] = hslToHex(h, s, l);
 * ```
 */
export function hslToHex(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;

  function hueToRgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // Achromatic (grey)
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h / 360 + 1 / 3);
    g = hueToRgb(p, q, h / 360);
    b = hueToRgb(p, q, h / 360 - 1 / 3);
  }

  // Convert RGB to hex
  const toHexValue = (x: number): number => Math.round(x * 255);

  return [
    toHexValue(r),
    toHexValue(g),
    toHexValue(b),
  ];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

//------------------------------
//  RGB
//------------------------------

export function normalizeRgb(r: number, g: number, b: number): [number, number, number] {
  return [r / 255, g / 255, b / 255];
}

export function rgbToHex(r: number, g: number, b: number): number {
  r = Math.round(r);
  g = Math.round(g);
  b = Math.round(b);

  return (r << 16) + (g << 8) + b;
}

/**
 * Converts an RGB color to HSL.
 *
 * Example usage:
 * ```
 * const rgbColor = { r: 255, g: 0, b: 0 }; // Red
 * const hslColor = rgbToHsl(rgbColor.r, rgbColor.g, rgbColor.b);
 * console.log(hslColor); // Output: { h: 0, s: 100, l: 50 }
 * ```
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  // Normalize r, g, b values to the range 0–1
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  // Calculate hue
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
      h = ((b - r) / delta + 2) * 60;
    } else if (max === b) {
      h = ((r - g) / delta + 4) * 60;
    }
  }

  // Calculate saturation
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
  }

  // Convert h and s to percentages
  h = Math.round(h);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return [ h, s, lPercent ];
}

//------------------------------
//  Distance functions
//------------------------------

/**
 * Calculate the Euclidean distance between two colors in RGB space
 * distance = sqrt((r1 - r2)^2 + (g1 - g2)^2 + (b1 - b2)^2)
 */
export function calculateDistance(color1: [number, number, number], color2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) +
    Math.pow(color1[1] - color2[1], 2) +
    Math.pow(color1[2] - color2[2], 2),
  );
}

/**
 * Calculate the sum of absolute differences for each channel
 * difference = |r1 - r2| + |g1 - g2| + |b1 - b2|
 */
export function calculateChannelDifference(color1: [number, number, number], color2: [number, number, number]): number {
  return (
    Math.abs(color1[0] - color2[0]) + //
    Math.abs(color1[1] - color2[1]) +
    Math.abs(color1[2] - color2[2])
  );
}

export function findClosestColor(inputColor: number, dataset: number[]): number | null {
  const inputRgb = hexToRgb(inputColor);
  let closestColor = null;
  let smallestDistance = Infinity;

  for (const entry of dataset) {
    const colorRgb = hexToRgb(entry);
    const distance = calculateDistance(inputRgb, colorRgb);

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestColor = entry;
    }
  }

  return closestColor;
}

export function findClosestColorChannelWise(inputColor: number, dataset: number[]): number | null {
  const inputRgb = hexToRgb(inputColor);
  let closestColor = null;
  let smallestDifference = Infinity;

  for (const entry of dataset) {
    const colorRgb = hexToRgb(entry);
    const difference = calculateChannelDifference(inputRgb, colorRgb);

    if (difference < smallestDifference) {
      smallestDifference = difference;
      closestColor = entry;
    }
  }

  return closestColor;
}

//------------------------------
//  Palette generation
//------------------------------

/**
 * Example usage:
 * ```
 * const baseHue = Math.floor(Math.random() * 360);
 * const color1 = getAnalogousColors(baseHue);
 * const color2 = getAnalogousColors(baseHue);
 * ```
 */
export function getAnalogousColors(baseHue: number): [number, number, number] {
  const h = (baseHue + Math.floor(-30 + Math.random() * 61)) % 360; // ±30 degrees from baseHue
  const s = Math.floor(60 + Math.random() * 21);                    // Saturation: 60 - 80
  const l = Math.floor(50 + Math.random() * 21);                    // Lightness: 50 - 70
  return hslToRgb(h, s, l);
}
