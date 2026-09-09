import { PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { applySnapshot, captureSnapshot, type CameraClip, type CameraSnapshot, type ClipRuntime } from "./cameraClip";

interface Run {
  clip: CameraClip;
  elapsed: number;
}

/**
 * Delta-time camera playback: one movement/transition plus one temporary effect.
 * Play captures the current pose; stop preserves it. Only reset restores a saved view.
 *
 * Optional OrbitControls integration disables input and synchronizes the target.
 * The host must also skip controls.update() while isPlaying: disabling input alone
 * does not stop controls or other external systems from writing to the camera.
 * Clips contain per-run state; do not share a clip between simultaneous players.
 *
 * @example
 * ```ts
 * const playback = new CameraPlayback(camera, controls);
 * playback.timeScale = 0.5; // half speed; changing speed never restarts a clip
 * playback.play(createOrbitClip({ target: new Vector3(), duration: 10 }));
 * // In your existing render loop (dt is seconds):
 * if (!playback.isPlaying) controls.update();
 * playback.update(dt);
 * // playback.stop() keeps the view; playback.reset() restores the saved view.
 * ```
 */
export class CameraPlayback {
  private speed = 1;
  private active: Run | null = null;
  private effect: Run | null = null;
  private readonly focus = new Vector3();
  private rest: CameraSnapshot;
  private base: CameraSnapshot | null = null;
  private controlsEnabled: boolean | null = null;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly controls?: OrbitControls,
  ) {
    this.rest = captureSnapshot(camera, controls);
    this.focus.copy(this.rest.target);
  }

  /** Playback clock multiplier: 1 = normal, 0.5 = half speed, 2 = double.
   * Zero freezes the current frame while retaining camera ownership.
   * Applies to both movement and effects; may change during a run.
   */
  get timeScale(): number {
    return this.speed;
  }
  set timeScale(value: number) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError("Camera timeScale must be finite and nonnegative");
    this.speed = value;
  }

  get isPlaying(): boolean {
    return this.active !== null || this.effect !== null;
  }
  get isMoving(): boolean {
    return this.active !== null;
  }
  get isEffectPlaying(): boolean {
    return this.effect !== null;
  }

  /** Capture an explicit restore point. Neither play nor stop restores it. */
  setRest(): void {
    this.rest = captureSnapshot(this.camera, this.controls);
  }
  setRestSnapshot(snapshot: CameraSnapshot): void {
    this.rest = {
      position: snapshot.position.clone(),
      quaternion: snapshot.quaternion.clone(),
      fov: snapshot.fov,
      target: snapshot.target.clone(),
    };
  }

  /** Start a movement/transition at the current base pose, or trigger an effect. */
  play(clip: CameraClip): void {
    if (!Number.isFinite(clip.duration) || clip.duration <= 0)
      throw new RangeError("Camera clip duration must be finite and positive");
    this.removeEffectPose();
    if (!this.isPlaying) {
      this.focus.copy(captureSnapshot(this.camera, this.controls).target);
      if (this.controls) {
        this.controlsEnabled = this.controls.enabled;
        this.controls.enabled = false;
      }
    }
    const run = { clip, elapsed: 0 };
    if (clip.kind === "effect") {
      if (this.effect) this.effect.clip.cancel?.(this.runtime(this.effect));
      this.effect = run;
    } else {
      if (this.active) this.active.clip.cancel?.(this.runtime(this.active));
      this.active = run;
    }
    clip.start(this.runtime(run));
  }

  /** Stop all playback, preserving the base pose and removing temporary offsets. */
  stop(): void {
    this.removeEffectPose();
    if (this.active) this.active.clip.cancel?.(this.runtime(this.active));
    if (this.effect) this.effect.clip.cancel?.(this.runtime(this.effect));
    this.active = this.effect = null;
    this.releaseControls();
  }

  /** Explicitly restore the saved view. Intended for repeatable example setup. */
  reset(): void {
    this.stop();
    applySnapshot(this.camera, this.controls, this.rest);
    this.focus.copy(this.rest.target);
  }

  /** Advance in seconds. The controller owns completion, independent of easing. */
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError("Camera playback delta must be finite and nonnegative");
    if (!this.isPlaying || this.speed === 0) return;
    dt *= this.speed;
    this.removeEffectPose();
    if (this.active && this.advance(this.active, dt)) this.active = null;
    if (this.effect) {
      this.base = captureSnapshot(this.camera);
      if (this.advance(this.effect, dt)) {
        this.effect = null;
        this.removeEffectPose();
      }
    }
    if (!this.isPlaying) this.releaseControls();
  }

  dispose(): void {
    this.stop();
  }

  private advance(run: Run, dt: number): boolean {
    run.elapsed = Math.min(run.clip.duration, run.elapsed + dt);
    run.clip.update(this.runtime(run), dt);
    return run.elapsed >= run.clip.duration;
  }
  private removeEffectPose(): void {
    if (!this.base) return;
    applySnapshot(this.camera, undefined, this.base);
    this.base = null;
  }
  private releaseControls(): void {
    if (this.controls && this.controlsEnabled !== null) {
      // Preserve the actual view when stopping during a look-direction blend.
      const distance = Math.max(1e-6, this.camera.position.distanceTo(this.focus));
      this.camera.getWorldDirection(this.focus);
      this.focus.multiplyScalar(distance).add(this.camera.position);
      this.controls.target.copy(this.focus);
      this.controls.enabled = this.controlsEnabled;
      this.controlsEnabled = null;
    }
  }
  private runtime(run: Run): ClipRuntime {
    return {
      camera: this.camera,
      controls: this.controls ?? null,
      elapsed: run.elapsed,
      duration: run.clip.duration,
      focus: this.focus,
    };
  }
}
