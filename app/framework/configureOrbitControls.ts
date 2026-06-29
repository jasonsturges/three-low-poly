import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Default OrbitControls feel for the example gallery.
 *
 * Damping only — no distance or polar clamps (full orbit/pan/zoom for fast iteration).
 * {@link DAMPING_FACTOR} is snappier than the portfolio ship inspect camera (`0.06`)
 * so navigation stays polished without feeling floaty.
 */
export const DAMPING_FACTOR = 0.16;

/** Apply gallery orbit defaults. Call once after constructing `OrbitControls`. */
export function configureOrbitControls(controls: OrbitControls): void {
  controls.enableDamping = true;
  controls.dampingFactor = DAMPING_FACTOR;
  controls.update();
}