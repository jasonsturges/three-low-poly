/**
 * Numeric color utilities: RGB channels use 0–255, HSL uses degrees / percentages.
 * These functions do not perform sRGB transfer-function conversion. normalizeRgb
 * changes scale only. Use Three Color with explicit SRGBColorSpace when rendering
 * byte RGB values. Distance helpers are numeric RGB metrics, not perceptual Delta E.
 */
//------------------------------
//  Hex
//------------------------------

/**
 * Convert hex color code color string to RGB array
 */
export function parseHexCode(hex: string): [number, number, number] {
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    throw new Error("parseHexCode expects #RGB or #RRGGBB (without alpha)");
  }
  const digits = hex.slice(1);
  const expanded = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
  return hexToRgb(Number.parseInt(expanded, 16));
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
  if (!Number.isInteger(hex) || hex < 0 || hex > 0xffffff) throw new Error("hexToRgb expects a 24-bit RGB integer");
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;

  return [r, g, b];
}

//------------------------------
//  HSL
//------------------------------

/** Convert HSL degrees / percentages to a packed 24-bit RGB number (for example, 0xff0000). */
export function hslToHex(h: number, s: number, l: number): number {
  return rgbToHex(...hslToRgb(h, s, l));
}

/** Hue wraps to [0, 360); saturation/lightness are clamped to 0–100. Returns fractional RGB bytes. */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (![h, s, l].every(Number.isFinite)) throw new Error("hslToRgb expects finite coordinates");
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

//------------------------------
//  RGB
//------------------------------

/** Divide byte channels by 255; this is normalization, not sRGB-to-linear conversion. */
export function normalizeRgb(r: number, g: number, b: number): [number, number, number] {
  return [r / 255, g / 255, b / 255];
}

export function rgbToHex(r: number, g: number, b: number): number {
  if (![r, g, b].every(Number.isFinite)) throw new Error("rgbToHex expects finite channels");
  r = Math.round(Math.max(0, Math.min(255, r)));
  g = Math.round(Math.max(0, Math.min(255, g)));
  b = Math.round(Math.max(0, Math.min(255, b)));

  return (r << 16) + (g << 8) + b;
}

/**
 * Converts RGB bytes to HSL degrees / percentages without rounding. Channels clamp to 0–255.
 *
 * Example usage:
 * ```
 * const rgbColor = { r: 255, g: 0, b: 0 }; // Red
 * const hslColor = rgbToHsl(rgbColor.r, rgbColor.g, rgbColor.b);
 * console.log(hslColor); // Output: [0, 100, 50]
 * ```
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  if (![r, g, b].every(Number.isFinite)) throw new Error("rgbToHsl expects finite channels");
  r = Math.max(0, Math.min(255, r)) / 255;
  g = Math.max(0, Math.min(255, g)) / 255;
  b = Math.max(0, Math.min(255, b)) / 255;

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

  return [h, s * 100, l * 100];
}

//------------------------------
//  Distance functions
//------------------------------

/**
 * Calculate the Euclidean distance between two colors in RGB space
 * distance = sqrt((r1 - r2)^2 + (g1 - g2)^2 + (b1 - b2)^2)
 */
export function calculateDistance(color1: [number, number, number], color2: [number, number, number]): number {
  return Math.sqrt(Math.pow(color1[0] - color2[0], 2) + Math.pow(color1[1] - color2[1], 2) + Math.pow(color1[2] - color2[2], 2));
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
