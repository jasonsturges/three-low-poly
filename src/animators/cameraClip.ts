import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { EasingFunction } from "../constants/Easing";

export type ClipPhase = "running" | "complete";

/** A camera view captured explicitly for later restoration. */
export interface CameraSnapshot {
  position: Vector3;
  quaternion: Quaternion;
  fov: number;
  target: Vector3;
}

/** Per-frame mutable state shared with the active clip. */
export interface ClipRuntime {
  camera: PerspectiveCamera;
  controls: OrbitControls | null;
  /** Seconds elapsed in the active clip. */
  elapsed: number;
  /** Clip duration in seconds. */
  duration: number;
  /** Look-at point the clip is focused on — synced to OrbitControls on complete. */
  focus: Vector3;
}

export interface CameraClip {
  /** Effects are temporary offsets evaluated after the movement/transition. */
  readonly kind?: "movement" | "transition" | "effect";
  readonly label: string;
  readonly duration: number;
  start(runtime: ClipRuntime): void;
  /** Evaluate the current time, including the endpoint. Playback owns completion.
   * Legacy phase returns are accepted but no longer control the clock. */
  update(runtime: ClipRuntime, dt: number): ClipPhase | void;
  /** Cleanup on interruption. Must preserve the base camera pose. */
  cancel?(runtime: ClipRuntime): void;
}

export interface CameraClipTiming {
  /** Duration in seconds. */
  duration: number;
  /** Progress easing for normalized time `t` in [0, 1]. Defaults to smoothstep. */
  ease?: EasingFunction;
}

export function captureSnapshot(camera: PerspectiveCamera, controls?: OrbitControls): CameraSnapshot {
  const target = controls?.target.clone() ?? new Vector3();
  if (!controls) {
    const dir = new Vector3();
    camera.getWorldDirection(dir);
    target.copy(camera.position).add(dir);
  }
  return {
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    fov: camera.fov,
    target,
  };
}

export function applySnapshot(camera: PerspectiveCamera, controls: OrbitControls | undefined, snapshot: CameraSnapshot): void {
  camera.position.copy(snapshot.position);
  camera.quaternion.copy(snapshot.quaternion);
  camera.fov = snapshot.fov;
  camera.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(snapshot.target);
  }
}

export function normalizedTime(runtime: ClipRuntime, ease: EasingFunction): number {
  const t = Math.min(1, runtime.elapsed / runtime.duration);
  return t === 0 || t === 1 ? t : ease(t);
}
