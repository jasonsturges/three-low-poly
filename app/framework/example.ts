/**
 * Example contract.
 *
 * An example module default-exports a {@link ExampleMount}: a function that
 * builds its scene into the supplied container and returns a cleanup function.
 * The gallery router calls the mount when an example is opened and the returned
 * cleanup when navigating away — that is the entire lifecycle. Everything else
 * (building geometry, wiring lil-gui, registering per-frame work) stays visible
 * in the example body rather than hidden behind a wrapper.
 */

/** Tears down everything the example created. Called on navigation away. */
export type ExampleCleanup = () => void;

/** Mounts an example into `container`; may return a cleanup function. */
export type ExampleMount = (container: HTMLElement) => ExampleCleanup | void;

/** Optional metadata an example can export to override path-derived defaults. */
export interface ExampleMeta {
  title?: string;
  description?: string;
}
