import { Object3D, Vector3 } from "three";

const viewerPosition = new Vector3();

/**
 * Pin a sky layer to the viewer, so it holds a **direction but never a location** — it can never
 * be approached, dollied toward, or placed behind anything. Call once at construction; the layer
 * then needs nothing per frame, so consumers only ever `scene.add(layer)`.
 *
 * Each renderable's `onBeforeRender` re-snaps the layer to the active camera. The renderer invokes
 * that hook before it derives the object's model-view matrix, so the move lands in the same frame.
 * Working on the container rather than in a shader is what makes this safe for `InstancedMesh`:
 * per-instance matrices are untouched, so instanced layers need no special handling.
 *
 * Notes:
 * - **This claims `onBeforeRender` on every renderable passed in.** Assigning your own handler to one
 *   of them silently breaks the lock — the layer stops tracking the camera, with no error. Wrap or
 *   chain the existing handler rather than replacing it. Nothing needs unsubscribing, though: the
 *   renderer only invokes the hook while the object is being drawn, so removing the layer from the
 *   scene stops it, and dropping the reference collects it. `dispose()` has nothing to undo.
 * - `frustumCulled` is disabled on every renderable. Culling runs *before* `onBeforeRender`, so a
 *   layer judged against a stale position could be culled and then never get the chance to correct
 *   itself.
 * - The camera's *world* position is used and converted back into the layer's parent space, so a
 *   transformed parent or a parented camera still resolves correctly.
 * - The layer sits at the origin until the first render, since nothing has supplied a camera yet.
 *   Read world positions off a sky layer only after a frame has been drawn.
 *
 * @example
 * ```typescript
 * class Sun extends Object3D {
 *   constructor() {
 *     super();
 *     const disc = new Mesh(geometry, material);
 *     this.add(disc);
 *     lockToViewer(this, [disc]);
 *   }
 * }
 * ```
 */
export function lockToViewer(layer: Object3D, renderables: Object3D[]): void {
  const snap: Object3D["onBeforeRender"] = (_renderer, _scene, camera) => {
    camera.getWorldPosition(viewerPosition);
    layer.position.copy(viewerPosition);
    layer.parent?.worldToLocal(layer.position);
    layer.updateMatrixWorld(true);
  };

  for (const renderable of renderables) {
    renderable.frustumCulled = false;
    renderable.onBeforeRender = snap;
  }
}
