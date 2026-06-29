import { MathUtils, Vector3 } from "three";
import { Easing, type EasingFunction } from "../constants/Easing";
import {
  normalizedTime,
  type CameraClip,
  type CameraClipTiming,
  type ClipRuntime,
} from "./cameraClip";

const tmp = new Vector3();
const tmp2 = new Vector3();

export interface OrbitClipOptions extends CameraClipTiming {
  target: Vector3;
  /** Horizontal distance from target. Defaults to current camera distance. */
  radius?: number;
  /** Elevation above target Y in radians. Defaults to current camera elevation. */
  elevation?: number;
  /** Revolutions over the clip. Defaults to `1`. */
  revolutions?: number;
}

/** Circle the scene — showcase reel orbit. */
export function createOrbitClip(options: OrbitClipOptions): CameraClip {
  const {
    target,
    duration,
    ease = Easing.smoothstep,
    revolutions = 1,
  } = options;
  const startAzimuth = { value: 0 };
  const radius = { value: options.radius ?? 10 };
  const elevation = { value: options.elevation ?? 0.4 };

  return {
    label: "Orbit",
    duration,
    start(runtime) {
      runtime.focus.copy(target);
      tmp.subVectors(runtime.camera.position, target);
      radius.value = options.radius ?? tmp.length();
      elevation.value = options.elevation ?? Math.asin(MathUtils.clamp(tmp.y / radius.value, -1, 1));
      startAzimuth.value = Math.atan2(tmp.z, tmp.x);
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      if (t >= 1) return "complete";

      const azimuth = startAzimuth.value + t * Math.PI * 2 * revolutions;
      const horiz = radius.value * Math.cos(elevation.value);
      runtime.camera.position.set(
        target.x + horiz * Math.cos(azimuth),
        target.y + radius.value * Math.sin(elevation.value),
        target.z + horiz * Math.sin(azimuth),
      );
      runtime.camera.lookAt(runtime.focus);
      return "running";
    },
  };
}

export interface PendulumClipOptions extends CameraClipTiming {
  target: Vector3;
  /** Distance from target. Defaults to current camera distance. */
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
 */
export function createPendulumClip(options: PendulumClipOptions): CameraClip {
  const {
    target,
    duration,
    azimuthAmplitude = 0.14,
    oscillations = 2,
    ease = Easing.linear,
  } = options;
  const baseAzimuth = { value: 0 };
  const distance = { value: options.distance ?? 8 };
  const elevation = { value: 0.35 };

  return {
    label: "Pendulum",
    duration,
    start(runtime) {
      runtime.focus.copy(target);
      tmp.subVectors(runtime.camera.position, target);
      distance.value = options.distance ?? tmp.length();
      elevation.value = Math.asin(MathUtils.clamp(tmp.y / distance.value, -1, 1));
      baseAzimuth.value = Math.atan2(tmp.z, tmp.x);
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      if (t >= 1) return "complete";

      const sway = Math.sin(t * Math.PI * 2 * oscillations) * azimuthAmplitude;
      const azimuth = baseAzimuth.value + sway;
      const horiz = distance.value * Math.cos(elevation.value);
      runtime.camera.position.set(
        target.x + horiz * Math.cos(azimuth),
        target.y + distance.value * Math.sin(elevation.value),
        target.z + horiz * Math.sin(azimuth),
      );
      runtime.camera.lookAt(runtime.focus);
      return "running";
    },
  };
}

export interface FlythroughClipOptions extends CameraClipTiming {
  waypoints: Vector3[];
  /** Optional look-at points per waypoint; defaults to next waypoint. */
  lookAt?: Vector3[];
  ease?: EasingFunction;
}

/** Waypoint tour through a sequence of positions. */
export function createFlythroughClip(options: FlythroughClipOptions): CameraClip {
  const { waypoints, duration, ease = Easing.cubicInOut } = options;
  if (waypoints.length < 2) throw new Error("Flythrough clip requires at least two waypoints");

  const lookAt = options.lookAt ?? waypoints.slice(1).concat(waypoints[waypoints.length - 1]!);
  const segments = waypoints.length - 1;

  return {
    label: "Flythrough",
    duration,
    start(runtime) {
      runtime.focus.copy(lookAt[0] ?? waypoints[0]!);
      runtime.camera.position.copy(waypoints[0]!);
      runtime.camera.lookAt(runtime.focus);
    },
    update(runtime) {
      const t = normalizedTime(runtime, Easing.linear);
      if (t >= 1) {
        runtime.camera.position.copy(waypoints[waypoints.length - 1]!);
        runtime.focus.copy(lookAt[lookAt.length - 1] ?? waypoints[waypoints.length - 1]!);
        runtime.camera.lookAt(runtime.focus);
        return "complete";
      }

      const scaled = t * segments;
      const seg = Math.min(segments - 1, Math.floor(scaled));
      const localT = ease(scaled - seg);

      runtime.camera.position.lerpVectors(waypoints[seg]!, waypoints[seg + 1]!, localT);
      const lookFrom = lookAt[seg] ?? waypoints[seg + 1]!;
      const lookTo = lookAt[seg + 1] ?? waypoints[seg + 1]!;
      runtime.focus.lerpVectors(lookFrom, lookTo, localT);
      runtime.camera.lookAt(runtime.focus);
      return "running";
    },
  };
}

export interface DollyClipOptions extends CameraClipTiming {
  /** Distance along view axis — positive pulls back, negative pushes in. */
  distance: number;
  ease?: EasingFunction;
}

/** Dolly in or out along the current view direction. */
export function createDollyClip(options: DollyClipOptions): CameraClip {
  const { distance, duration, ease = Easing.cubicInOut } = options;
  const startPos = new Vector3();
  const endPos = new Vector3();
  const viewDir = new Vector3();

  return {
    label: "Dolly",
    duration,
    start(runtime) {
      startPos.copy(runtime.camera.position);
      runtime.camera.getWorldDirection(viewDir);
      endPos.copy(startPos).addScaledVector(viewDir, distance);
      runtime.focus.copy(runtime.controls?.target ?? startPos).addScaledVector(viewDir, 10);
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      if (t >= 1) {
        runtime.camera.position.copy(endPos);
        return "complete";
      }
      runtime.camera.position.lerpVectors(startPos, endPos, t);
      runtime.camera.lookAt(runtime.focus);
      return "running";
    },
  };
}

export interface SpiralClipOptions extends CameraClipTiming {
  /** Ground point to look down at (typically scene center, `y = 0`). */
  target: Vector3;
  /** Orbit radius at the start of the clip. */
  radius: number;
  /** Optional wider radius at the end — pulls back as you rise. Defaults to `radius`. */
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
 */
export function createSpiralClip(options: SpiralClipOptions): CameraClip {
  const {
    target,
    radius,
    endRadius = radius,
    height,
    revolutions,
    duration,
    ease = Easing.smoothstep,
  } = options;
  const startY = { value: 0 };
  const startAzimuth = { value: 0 };

  return {
    label: "Spiral",
    duration,
    start(runtime) {
      runtime.focus.copy(target);
      startY.value = runtime.camera.position.y;
      tmp.subVectors(runtime.camera.position, target);
      startAzimuth.value = Math.atan2(tmp.z, tmp.x);
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      if (t >= 1) return "complete";

      const angle = startAzimuth.value + t * Math.PI * 2 * revolutions;
      const orbitRadius = MathUtils.lerp(radius, endRadius, t);
      runtime.camera.position.set(
        target.x + orbitRadius * Math.cos(angle),
        startY.value + height * t,
        target.z + orbitRadius * Math.sin(angle),
      );
      runtime.camera.lookAt(runtime.focus);
      return "running";
    },
  };
}

export interface ZoomClipOptions extends CameraClipTiming {
  target: Vector3;
  /** Narrower FOV at the end of the clip (e.g. `35` from `75`). */
  endFov: number;
  ease?: EasingFunction;
}

/** Focus punch — smooth FOV narrow toward a target. Restores FOV on cancel; keeps end FOV on complete. */
export function createZoomClip(options: ZoomClipOptions): CameraClip {
  const { target, endFov, duration, ease = Easing.cubicInOut } = options;
  const startFov = { value: 75 };

  return {
    label: "Zoom",
    duration,
    start(runtime) {
      runtime.focus.copy(target);
      startFov.value = runtime.camera.fov;
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      runtime.camera.fov = MathUtils.lerp(startFov.value, endFov, Math.min(1, t));
      runtime.camera.updateProjectionMatrix();
      runtime.camera.lookAt(runtime.focus);
      return t >= 1 ? "complete" : "running";
    },
    cancel(runtime) {
      runtime.camera.fov = startFov.value;
      runtime.camera.updateProjectionMatrix();
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
 */
export function createWobbleClip(options: WobbleClipOptions): CameraClip {
  const { intensity, duration, ease = Easing.linear } = options;
  const origin = new Vector3();
  const seed = { value: 0 };

  return {
    label: "Wobble",
    duration,
    start(runtime) {
      origin.copy(runtime.camera.position);
      seed.value = runtime.camera.position.x * 17.3 + runtime.camera.position.z * 9.1;
    },
    update(runtime) {
      const t = normalizedTime(runtime, ease);
      if (t >= 1) {
        runtime.camera.position.copy(origin);
        return "complete";
      }

      const decay = 1 - t;
      const w = runtime.elapsed * 28 + seed.value;
      runtime.camera.position.set(
        origin.x + Math.sin(w * 1.7) * intensity * decay,
        origin.y + Math.sin(w * 2.3) * intensity * 0.6 * decay,
        origin.z + Math.cos(w * 1.9) * intensity * decay,
      );
      return "running";
    },
    cancel(runtime) {
      runtime.camera.position.copy(origin);
    },
  };
}