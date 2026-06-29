import { PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  applySnapshot,
  captureSnapshot,
  type CameraClip,
  type CameraSnapshot,
  type ClipRuntime,
} from "./cameraClip";

/**
 * Single director for camera showcase clips — Unity demo-scene style playback.
 *
 * One active clip at a time, driven by {@link update} with elapsed seconds (`dt`),
 * not nested `requestAnimationFrame` loops. Disables OrbitControls while playing;
 * re-enables and syncs `controls.target` to the clip focus on complete.
 *
 * @example
 * ```ts
 * const playback = new CameraPlayback(camera, controls);
 * playback.setRest(); // snapshot current pose as Reset target
 *
 * onFrame((dt) => {
 *   playback.update(dt);
 *   controls.update();
 *   renderer.render(scene, camera);
 * });
 *
 * playback.play(createOrbitClip({ target, radius: 10, duration: 8 }));
 * ```
 */
export class CameraPlayback {
  private active: CameraClip | null = null;
  private elapsed = 0;
  private readonly focus = new Vector3();
  private rest: CameraSnapshot;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly controls?: OrbitControls,
  ) {
    const snap = captureSnapshot(camera, controls);
    this.focus.copy(snap.target);
    this.rest = snap;
  }

  /** Whether a clip is actively playing. */
  get isPlaying(): boolean {
    return this.active !== null;
  }

  /** Snapshot the current camera + controls pose as the Reset/rest pose. */
  setRest(): void {
    this.rest = captureSnapshot(this.camera, this.controls);
  }

  /** Replace the rest pose without stopping playback. */
  setRestSnapshot(snapshot: CameraSnapshot): void {
    this.rest = {
      position: snapshot.position.clone(),
      quaternion: snapshot.quaternion.clone(),
      fov: snapshot.fov,
      target: snapshot.target.clone(),
    };
  }

  /**
   * Begin a clip. Cancels any active clip first.
   * OrbitControls are disabled until the clip completes or {@link stop} is called.
   */
  play(clip: CameraClip): void {
    this.cancelActive();
    applySnapshot(this.camera, this.controls, this.rest);
    this.active = clip;
    this.elapsed = 0;
    if (this.controls) this.controls.enabled = false;
    clip.start(this.runtime());
  }

  /** Cancel the active clip and restore the rest pose. */
  stop(): void {
    this.cancelActive();
    applySnapshot(this.camera, this.controls, this.rest);
    if (this.controls) {
      this.controls.enabled = true;
      this.controls.update();
    }
  }

  /** Alias for {@link stop} — return to the rest pose. */
  reset(): void {
    this.stop();
  }

  /**
   * Advance the active clip. Call from the scene `onFrame` callback each frame.
   * @param dt Elapsed seconds since last frame.
   */
  update(dt: number): void {
    if (!this.active) return;

    this.elapsed += dt;
    const phase = this.active.update(this.runtime(), dt);

    if (phase === "complete") {
      this.active = null;
      this.elapsed = 0;
      if (this.controls) {
        this.controls.target.copy(this.focus);
        this.controls.enabled = true;
        this.controls.update();
      }
    }
  }

  /** Release references; call from example dispose. */
  dispose(): void {
    this.stop();
  }

  private cancelActive(): void {
    if (!this.active) return;
    this.active.cancel?.(this.runtime());
    this.active = null;
    this.elapsed = 0;
  }

  private runtime(): ClipRuntime {
    return {
      camera: this.camera,
      controls: this.controls ?? null,
      elapsed: this.elapsed,
      duration: this.active?.duration ?? 0,
      focus: this.focus,
    };
  }
}