import { Mesh, MeshStandardMaterial, type Vector2 } from "three";
import { CorkGeometry, type CorkGeometryOptions } from "../geometry/vessels/CorkGeometry";

export interface CorkStopperOptions {
  /** Cork shape — upper (vertical collar) and lower (plug) heights, and tip radius. Top is locked to the seal. */
  cork?: CorkGeometryOptions;
  /** How deep the cork sits: `0` = tip at the rim, `1` = the flat top flush. Defaults to `0.6`. */
  corkDepth?: number;
  /** Cork material. A cork-brown default is supplied. */
  material?: MeshStandardMaterial;
}

/**
 * A cork stopper seated in a vessel's rim — the shared cork-fit for corked vessels (jar, potion bottle, …).
 *
 * A lid: the top radius equals the middle, so any `upperHeight` rises as a VERTICAL collar above the seal,
 * never a wider head that could intersect the rolled rim. The cork is scaled UNIFORMLY so that, at
 * `corkDepth` up its lower taper, its radius equals the vessel's opening — a watertight seal at any depth;
 * rise the cork and it scales up to keep it.
 *
 * Give it the vessel's `.profile`, its `rim` option (`rimRoll` — the rolled rim shrinks the opening), and
 * the circumference segments to match. Returns the cork mesh, seated; add it to the vessel's group.
 */
export function createCorkStopper(
  profile: Vector2[],
  rimRoll: number,
  segments: number,
  { cork, corkDepth = 0.6, material }: CorkStopperOptions = {},
): Mesh {
  const rim = profile[profile.length - 1]!;
  const rimRadius = rim.x;
  const rimY = rim.y; // the neck point — the lid's flat top meets the inner rim edge here
  const opening = rimRadius * (1 - Math.min(0.9, Math.max(0, rimRoll)));

  const corkGeometry = new CorkGeometry({
    radius: 1,
    // Default = the middle: a vertical cap rise, no head. A smaller value tapers the head in (top === bottom
    // gives a symmetric barrel — a wine cork's bulge).
    topRadius: cork?.topRadius ?? 1,
    bottomRadius: cork?.bottomRadius ?? 0.72,
    upperHeight: cork?.upperHeight ?? 0,
    lowerHeight: cork?.lowerHeight ?? 0.7,
    radialSegments: cork?.radialSegments ?? segments,
  });
  const depth = Math.min(1, Math.max(0, corkDepth));
  const radiusAtRim = corkGeometry.bottomRadius + (corkGeometry.radius - corkGeometry.bottomRadius) * depth;
  const corkScale = opening / radiusAtRim;

  const mesh = new Mesh(
    corkGeometry,
    material ?? new MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.9, metalness: 0, flatShading: true }),
  );
  mesh.scale.setScalar(corkScale);
  mesh.position.y = rimY - corkGeometry.middleY * depth * corkScale;
  mesh.castShadow = true;
  return mesh;
}
