import { WebGPURenderer } from "three/webgpu";

export interface WebGPURendererOptions {
  /** Defaults to `true`. Immutable after the renderer is created. */
  antialias?: boolean;
}

/**
 * Gallery WebGPU renderer. `WebGPURenderer` falls back to its WebGL2 backend
 * automatically when WebGPU is unavailable, so this stays the single renderer for
 * every example. Note it must be `await renderer.init()`-ed before the first render
 * (the scene harnesses handle that and start their loop once it resolves).
 */
export function createWebGPURenderer({ antialias = true }: WebGPURendererOptions = {}): WebGPURenderer {
  return new WebGPURenderer({ antialias });
}
