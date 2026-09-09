import { MathUtils, Quaternion, Vector3 } from "three";
import { Easing, type EasingFunction } from "../constants/Easing";
import { normalizedTime, type CameraClip, type CameraClipTiming, type ClipRuntime } from "./cameraClip";

const tmp = new Vector3();
const aimRotation = new Quaternion();

// Ease into a new look direction during the first quarter of a clip.
function aim(runtime: ClipRuntime, start: Quaternion): void {
  runtime.camera.lookAt(runtime.focus);
  const blend = Easing.smoothstep(Math.min(1, (runtime.elapsed / runtime.duration) * 4));
  aimRotation.copy(runtime.camera.quaternion);
  runtime.camera.quaternion.slerpQuaternions(start, aimRotation, blend);
  // Keep the camera's up convention through the blend, avoiding incidental roll
  // that an orbit controller would otherwise remove at handoff.
  runtime.camera.getWorldDirection(tmp);
  runtime.camera.lookAt(tmp.add(runtime.camera.position));
}

export interface OrbitClipOptions extends CameraClipTiming {
  target: Vector3;
  /** Distance from target. Interpolates from the current distance when specified. */
  radius?: number;
  /** Elevation above target Y in radians. Defaults to current camera elevation. */
  elevation?: number;
  /** Revolutions over the clip. Defaults to `1`. */
  revolutions?: number;
}

/**
 * Circle the scene — showcase reel orbit.
 *
 * @example
 * ```ts
 * playback.play(createOrbitClip({
 *   target: new Vector3(0, 0.5, 0),
 *   revolutions: 1,
 *   duration: 10, // seconds; use ease: Easing.linear for steady angular speed
 * }));
 * ```
 */
export function createOrbitClip(options: OrbitClipOptions): CameraClip {
  const { target, duration, ease = Easing.smoothstep, revolutions = 1 } = options;
  const startAzimuth = { value: 0 };
  const radius = { value: 0 };
  const elevation = { value: options.elevation ?? 0.4 };

  const startRotation = new Quaternion();
  return {
    label: "Orbit",
    kind: "movement",
    duration,
    start(runtime) {
      startRotation.copy(runtime.camera.quaternion);
      runtime.focus.copy(target);
      tmp.subVectors(runtime.camera.position, target);
      radius.value = tmp.length();
      elevation.value = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z));
      startAzimuth.value = Math.atan2(tmp.z, tmp.x);
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);

      const azimuth = startAzimuth.value + t * Math.PI * 2 * revolutions;
      const r = MathUtils.lerp(radius.value, options.radius ?? radius.value, t);
      const e = MathUtils.lerp(elevation.value, options.elevation ?? elevation.value, t);
      const horiz = r * Math.cos(e);
      runtime.camera.position.set(
        target.x + horiz * Math.cos(azimuth),
        target.y + r * Math.sin(e),
        target.z + horiz * Math.sin(azimuth),
      );
      aim(runtime, startRotation);
      return runtime.elapsed >= runtime.duration ? "complete" : "running";
    },
  };
}

export interface PendulumClipOptions extends CameraClipTiming {
  target: Vector3;
  /** End distance from target. Defaults to the captured camera distance. */
  distance?: number;
  /** Peak azimuth swing in radians — keep small for Ken Burns mood (e.g. `0.12`). */
  azimuthAmplitude?: number;
  /** Slow back-and-forth cycles over the clip. Defaults to `2`. */
  oscillations?: number;
  ease?: EasingFunction;
}

/**
 * Atmospheric focus drift — slow Ken Burns sway while locked on a subject.
 * Not a full orbit; subtle back-and-forth for mood and screen capture.
 *
 * @example
 * ```ts
 * playback.play(createPendulumClip({
 *   target: new Vector3(0, 0.5, 0),
 *   azimuthAmplitude: 0.12, oscillations: 2, duration: 24,
 * }));
 * ```
 */
export function createPendulumClip(options: PendulumClipOptions): CameraClip {
  const { target, duration, azimuthAmplitude = 0.14, oscillations = 2, ease = Easing.linear } = options;
  const baseAzimuth = { value: 0 };
  const distance = { value: options.distance ?? 8 };
  const elevation = { value: 0.35 };

  const startRotation = new Quaternion();
  return {
    label: "Pendulum",
    kind: "movement",
    duration,
    start(runtime) {
      startRotation.copy(runtime.camera.quaternion);
      runtime.focus.copy(target);
      tmp.subVectors(runtime.camera.position, target);
      distance.value = tmp.length();
      elevation.value = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z));
      baseAzimuth.value = Math.atan2(tmp.z, tmp.x);
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);

      const sway = Math.sin(t * Math.PI * 2 * oscillations) * azimuthAmplitude;
      const azimuth = baseAzimuth.value + sway;
      const r = MathUtils.lerp(distance.value, options.distance ?? distance.value, t);
      const horiz = r * Math.cos(elevation.value);
      runtime.camera.position.set(
        target.x + horiz * Math.cos(azimuth),
        target.y + r * Math.sin(elevation.value),
        target.z + horiz * Math.sin(azimuth),
      );
      aim(runtime, startRotation);
      return runtime.elapsed >= runtime.duration ? "complete" : "running";
    },
  };
}

export interface FlythroughClipOptions extends CameraClipTiming {
  waypoints: Vector3[];
  /** Optional look-at points per waypoint; defaults to the current focus. */
  lookAt?: Vector3[];
  ease?: EasingFunction;
}

/**
 * Tour from the current view through destination waypoints; eases at each waypoint.
 *
 * @example
 * ```ts
 * // Start at the current camera position, then visit these destinations.
 * playback.play(createFlythroughClip({
 *   waypoints: [new Vector3(4, 3, 0), new Vector3(-5, 2.5, -4), new Vector3(0, 2, 5)],
 *   duration: 12,
 * }));
 * ```
 * @example
 * ```ts
 * // lookAt[i] is the subject to frame when arriving at waypoints[i].
 * // Focus interpolates between subjects; omit lookAt to retain the starting focus.
 * playback.play(createFlythroughClip({
 *   waypoints: [new Vector3(4, 3, 0), new Vector3(-5, 2.5, -4), new Vector3(0, 2, 5)],
 *   lookAt: [new Vector3(0, 0.5, 0), new Vector3(-3, 0.75, -2.5), new Vector3(1.5, 0.5, 2)],
 *   duration: 12,
 * }));
 * ```
 */
export function createFlythroughClip(options: FlythroughClipOptions): CameraClip {
  const { duration, ease = Easing.cubicInOut } = options;
  let waypoints = options.waypoints.map((p) => p.clone());
  if (waypoints.length < 2) throw new Error("Flythrough clip requires at least two waypoints");

  let lookAt: Vector3[] = [];
  let segments = 0;

  const startRotation = new Quaternion();
  return {
    label: "Flythrough",
    kind: "movement",
    duration,
    start(runtime) {
      startRotation.copy(runtime.camera.quaternion);
      waypoints = [runtime.camera.position.clone(), ...options.waypoints.map((p) => p.clone())];
      lookAt = [runtime.focus.clone(), ...options.waypoints.map((_, i) => options.lookAt?.[i]?.clone() ?? runtime.focus.clone())];
      segments = waypoints.length - 1;
    },
    update(runtime) {
      const t = normalizedTime(runtime, Easing.linear);
      if (t >= 1) {
        runtime.camera.position.copy(waypoints[waypoints.length - 1]!);
        runtime.focus.copy(lookAt[lookAt.length - 1] ?? waypoints[waypoints.length - 1]!);
        aim(runtime, startRotation);
        return "complete";
      }

      const scaled = t * segments;
      const seg = Math.min(segments - 1, Math.floor(scaled));
      const localT = ease(scaled - seg);

      runtime.camera.position.lerpVectors(waypoints[seg]!, waypoints[seg + 1]!, localT);
      const lookFrom = lookAt[seg] ?? waypoints[seg + 1]!;
      const lookTo = lookAt[seg + 1] ?? waypoints[seg + 1]!;
      runtime.focus.lerpVectors(lookFrom, lookTo, localT);
      aim(runtime, startRotation);
      return runtime.elapsed >= runtime.duration ? "complete" : "running";
    },
  };
}

export interface DollyClipOptions extends CameraClipTiming {
  /** Distance along view axis — positive pulls back, negative pushes in. */
  distance: number;
  ease?: EasingFunction;
}

/**
 * Dolly in or out along the current view direction.
 *
 * @example
 * ```ts
 * playback.play(createDollyClip({ distance: -3, duration: 4 })); // dolly in
 * // Use distance: 3 to dolly out. Position changes; FOV stays the same.
 * ```
 */
export function createDollyClip(options: DollyClipOptions): CameraClip {
  const { distance, duration, ease = Easing.cubicInOut } = options;
  const startPos = new Vector3();
  const endPos = new Vector3();
  const viewDir = new Vector3();
  const startFocus = new Vector3();

  const startRotation = new Quaternion();
  return {
    label: "Dolly",
    kind: "movement",
    duration,
    start(runtime) {
      startRotation.copy(runtime.camera.quaternion);
      startPos.copy(runtime.camera.position);
      startFocus.copy(runtime.focus);
      runtime.camera.getWorldDirection(viewDir);
      endPos.copy(startPos).addScaledVector(viewDir, -distance);
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      if (t >= 1) {
        runtime.camera.position.copy(endPos);
        runtime.focus.copy(startFocus).addScaledVector(viewDir, -distance);
        return "complete";
      }
      runtime.camera.position.lerpVectors(startPos, endPos, t);
      runtime.focus.copy(startFocus).addScaledVector(viewDir, -distance * t);
      return runtime.elapsed >= runtime.duration ? "complete" : "running";
    },
  };
}

export interface SpiralClipOptions extends CameraClipTiming {
  /** Ground point to look down at (typically scene center, `y = 0`). */
  target: Vector3;
  /** @deprecated Use endRadius. Starting radius is always captured from the camera. */
  radius?: number;
  /** Optional wider radius at the end — pulls back as you rise. Defaults to the captured radius. */
  endRadius?: number;
  /** Total vertical rise over the clip. */
  height: number;
  revolutions: number;
  ease?: EasingFunction;
}

/**
 * Scene-transition spiral — orbit upward while looking down at the scene.
 * Camera rises and optionally widens its orbit; `lookAt` stays on the ground
 * target so the view pitches into a bird's-eye survey (not a horizontal orbit).
 *
 * @example
 * ```ts
 * playback.play(createSpiralClip({
 *   target: new Vector3(0, 0.5, 0), height: 28, endRadius: 12,
 *   revolutions: 1, duration: 12,
 * }));
 * ```
 */
export function createSpiralClip(options: SpiralClipOptions): CameraClip {
  const { target, radius, endRadius, height, revolutions, duration, ease = Easing.smoothstep } = options;
  const startRadius = { value: 0 };
  const startY = { value: 0 };
  const startAzimuth = { value: 0 };

  const startRotation = new Quaternion();
  return {
    label: "Spiral",
    kind: "transition",
    duration,
    start(runtime) {
      startRotation.copy(runtime.camera.quaternion);
      runtime.focus.copy(target);
      startRadius.value = Math.hypot(runtime.camera.position.x - target.x, runtime.camera.position.z - target.z);
      startY.value = runtime.camera.position.y;
      tmp.subVectors(runtime.camera.position, target);
      startAzimuth.value = Math.atan2(tmp.z, tmp.x);
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);

      const angle = startAzimuth.value + t * Math.PI * 2 * revolutions;
      const orbitRadius = MathUtils.lerp(startRadius.value, endRadius ?? radius ?? startRadius.value, t);
      runtime.camera.position.set(
        target.x + orbitRadius * Math.cos(angle),
        startY.value + height * t,
        target.z + orbitRadius * Math.sin(angle),
      );
      aim(runtime, startRotation);
      return runtime.elapsed >= runtime.duration ? "complete" : "running";
    },
  };
}

export interface ZoomClipOptions extends CameraClipTiming {
  target: Vector3;
  /** Narrower FOV at the end of the clip (e.g. `35` from `75`). */
  endFov: number;
  ease?: EasingFunction;
}

/**
 * Focus punch — smooth FOV narrow toward a target. Keeps the current FOV on stop and the end FOV on complete.
 *
 * @example
 * ```ts
 * playback.play(createZoomClip({ target: new Vector3(0, 0.5, 0), endFov: 35, duration: 3 }));
 * // A larger endFov zooms out. FOV changes; position stays the same.
 * ```
 */
export function createZoomClip(options: ZoomClipOptions): CameraClip {
  const { target, endFov, duration, ease = Easing.cubicInOut } = options;
  const startFov = { value: 75 };

  const startRotation = new Quaternion();
  return {
    label: "Zoom",
    kind: "movement",
    duration,
    start(runtime) {
      startRotation.copy(runtime.camera.quaternion);
      runtime.focus.copy(target);
      startFov.value = runtime.camera.fov;
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      runtime.camera.fov = MathUtils.lerp(startFov.value, endFov, Math.min(1, t));
      runtime.camera.updateProjectionMatrix();
      aim(runtime, startRotation);
      return t >= 1 ? "complete" : "running";
    },
  };
}

export interface WobbleClipOptions extends CameraClipTiming {
  /** Peak positional shake in world units. */
  intensity: number;
  ease?: EasingFunction;
}

/**
 * Impact wobble — short head-shake / recovery shake (gameplay feedback).
 * Decaying sinusoidal offset, not random noise. For showcase orbit rigs use
 * {@link createPendulumClip} instead.
 *
 * @example
 * ```ts
 * playback.play(createOrbitClip({ target: new Vector3(), duration: 10 }));
 * playback.play(createWobbleClip({ intensity: 0.15, duration: 0.8 }));
 * // Wobble layers over the orbit, then removes only its temporary offset.
 * ```
 */
export function createWobbleClip(options: WobbleClipOptions): CameraClip {
  const { intensity, duration, ease = Easing.linear } = options;

  const seed = { value: 0 };

  const startRotation = new Quaternion();
  return {
    label: "Wobble",
    kind: "effect",
    duration,
    start(runtime) {
      startRotation.copy(runtime.camera.quaternion);

      seed.value = runtime.camera.position.x * 17.3 + runtime.camera.position.z * 9.1;
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      if (t >= 1) {
        return "complete";
      }

      const decay = 1 - t;
      const w = runtime.elapsed * 28 + seed.value;
      tmp
        .set(
          Math.sin(w * 1.7) * intensity * decay,
          Math.sin(w * 2.3) * intensity * 0.6 * decay,
          Math.cos(w * 1.9) * intensity * decay,
        )
        .applyQuaternion(runtime.camera.quaternion);
      runtime.camera.position.add(tmp);
      return runtime.elapsed >= runtime.duration ? "complete" : "running";
    },
  };
}

export interface CraneRevealClipOptions extends CameraClipTiming {
  /** Subject to reveal as the camera rises. */
  target: Vector3;
  /** Vertical displacement in world units. Positive rises; negative descends. */
  height: number;
}

/**
 * Rise from the current view while gradually framing a subject; keep the final view.
 * Position rises along world Y. The starting look direction blends toward the
 * subject over the full duration, so the reveal remains gradual.
 *
 * @example
 * ```ts
 * playback.play(createCraneRevealClip({
 *   target: new Vector3(0, 0.5, 0), height: 6, duration: 5,
 * }));
 * ```
 */
export function createCraneRevealClip(options: CraneRevealClipOptions): CameraClip {
  const { target, height, duration, ease = Easing.smoothstep } = options;
  const origin = new Vector3();
  const initialDirection = new Vector3();
  const startFocus = new Vector3();
  const subject = target.clone();
  return {
    label: "Crane Reveal",
    kind: "transition",
    duration,
    start(runtime) {
      origin.copy(runtime.camera.position);
      runtime.camera.getWorldDirection(initialDirection);
      // Preserve the initial view axis, even if the requested subject is elsewhere.
      initialDirection.multiplyScalar(Math.max(1, origin.distanceTo(subject)));
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      runtime.camera.position.copy(origin);
      runtime.camera.position.y += height * t;
      startFocus.copy(runtime.camera.position).add(initialDirection);
      runtime.focus.lerpVectors(startFocus, subject, t);
      runtime.camera.lookAt(runtime.focus);
    },
  };
}

export interface ImpactKickClipOptions extends CameraClipTiming {
  /** Camera-local kick direction: +X right, +Y up, +Z backward. Normalized internally. */
  direction?: Vector3;
  /** Kick amplitude in world units. Defaults to 0.25. */
  intensity?: number;
  /** Number of damped rebound cycles. Defaults to 2. */
  oscillations?: number;
}

/**
 * Directional impact with a damped rebound, layered over the current movement.
 * Starts and ends with zero displacement. Retriggering replaces the active effect.
 *
 * @example
 * ```ts
 * playback.play(createImpactKickClip({
 *   direction: new Vector3(-1, 0.3, 0), intensity: 0.3, duration: 0.7,
 * }));
 * ```
 */
export function createImpactKickClip(options: ImpactKickClipOptions): CameraClip {
  const { duration, intensity = 0.25, oscillations = 2, ease = Easing.linear } = options;
  const direction = (options.direction ?? new Vector3(0, 0, 1)).clone().normalize();
  const offset = new Vector3();
  return {
    label: "Impact Kick",
    kind: "effect",
    duration,
    start() {},
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      const envelope = t === 0 || t === 1 ? 0 : Math.sin(t * Math.PI * 2 * oscillations) * Math.exp(-4 * t) * (1 - t);
      offset
        .copy(direction)
        .multiplyScalar(intensity * envelope)
        .applyQuaternion(runtime.camera.quaternion);
      runtime.camera.position.add(offset);
    },
  };
}

export interface FovPulseClipOptions extends CameraClipTiming {
  /** Peak additive FOV change in degrees. Positive widens; negative narrows. Defaults to 8. */
  amplitude?: number;
}

/**
 * Brief lens pulse relative to the current animated FOV, with zero offset at each end.
 * Safe to layer over Zoom: recovery follows its changing base FOV, not a saved value.
 * The resulting FOV is clamped to [1, 179] degrees.
 *
 * @example
 * ```ts
 * playback.play(createZoomClip({ target: new Vector3(), endFov: 35, duration: 3 }));
 * playback.play(createFovPulseClip({ amplitude: 8, duration: 0.8 }));
 * ```
 */
export function createFovPulseClip(options: FovPulseClipOptions): CameraClip {
  const { duration, amplitude = 8, ease = Easing.linear } = options;
  return {
    label: "FOV Pulse",
    kind: "effect",
    duration,
    start() {},
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      const envelope = t === 0 || t === 1 ? 0 : Math.sin(Math.PI * t) ** 2;
      runtime.camera.fov = MathUtils.clamp(runtime.camera.fov + amplitude * envelope, 1, 179);
      runtime.camera.updateProjectionMatrix();
    },
  };
}
