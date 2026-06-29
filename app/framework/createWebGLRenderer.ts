import { WebGLRenderer } from "three";

export interface WebGLRendererOptions {
  /** Defaults to `true`. Immutable after the renderer is created. */
  antialias?: boolean;
}

/**
 * Gallery WebGL renderer — stencil buffer enabled for masked lattice windows
 * and similar effects. Stencil is allocated at context creation (like MSAA);
 * meshes that do not set stencil material properties are unaffected.
 */
export function createWebGLRenderer({ antialias = true }: WebGLRendererOptions = {}): WebGLRenderer {
  return new WebGLRenderer({ antialias, stencil: true });
}