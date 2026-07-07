import { BoxGeometry, BufferGeometry, OctahedronGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { barBetween } from "./barBetween";

export interface HangingLanternGeometryOptions {
  /** Chain length from the hang point. Defaults to `3`. */
  drop?: number;
  /** Chain link cross-section. Defaults to `0.05`. */
  chainWidth?: number;
  /** Cap width (X). Defaults to `0.18`. */
  capWidth?: number;
  /** Cap height (Y). Defaults to `0.16`. */
  capHeight?: number;
  /** Cap depth (Z). Defaults to `0.18`. */
  capDepth?: number;
  /** Cap center offset below the chain bottom. Defaults to `0.02`. */
  capOffset?: number;
  /** Cage vertex radius before stretch. Defaults to `0.42`. */
  cageRadius?: number;
  /** Vertical stretch on the cage. Defaults to `1.4`. */
  cageStretch?: number;
  /** Extra downward offset below the cap-center cage attach. Defaults to `0`. */
  cageGap?: number;
  /** Cage strut thickness. Defaults to `0.03`. */
  cageBarWidth?: number;
  /** Inner lamp scale relative to the cage (inset to sit inside struts). Defaults to `0.96`. */
  innerScale?: number;
  /** Include the solid inner octahedron lamp volume. Defaults to `true`. */
  inner?: boolean;
}

/**
 * Wrought-iron hanging lantern frame — chain, cap, and open octahedron cage
 * built from edge struts.
 *
 * Material groups: `0` mount (chain + cap), `1` cage struts, `2` inner lamp
 * (solid octahedron).
 *
 * Local frame: origin at the chain top (hang point). The cage top vertex
 * attaches at the cap center, optionally lowered by `cageGap`.
 */
export class HangingLanternGeometry extends BufferGeometry {
  readonly drop: number;
  readonly chainWidth: number;
  readonly capWidth: number;
  readonly capHeight: number;
  readonly capDepth: number;
  readonly capOffset: number;
  readonly cageRadius: number;
  readonly cageStretch: number;
  readonly cageGap: number;
  readonly cageBarWidth: number;
  readonly innerScale: number;
  readonly inner: boolean;
  /** Y of the cage center in local space (negative, below the hang point). */
  readonly cageCenterY: number;

  constructor({
    drop = 3,
    chainWidth = 0.05,
    capWidth = 0.18,
    capHeight = 0.16,
    capDepth = 0.18,
    capOffset = 0.02,
    cageRadius = 0.42,
    cageStretch = 1.4,
    cageGap = 0,
    cageBarWidth = 0.03,
    innerScale = 0.96,
    inner = true,
  }: HangingLanternGeometryOptions = {}) {
    super();

    this.drop = drop;
    this.chainWidth = chainWidth;
    this.capWidth = capWidth;
    this.capHeight = capHeight;
    this.capDepth = capDepth;
    this.capOffset = capOffset;
    this.cageRadius = cageRadius;
    this.cageStretch = cageStretch;
    this.cageGap = cageGap;
    this.cageBarWidth = cageBarWidth;
    this.innerScale = innerScale;
    this.inner = inner;

    const capCenterY = -drop + capOffset;
    this.cageCenterY = capCenterY - cageRadius * cageStretch - cageGap;

    const mount: BufferGeometry[] = [];

    const chain = new BoxGeometry(chainWidth, drop, chainWidth);
    chain.translate(0, -drop / 2, 0);
    mount.push(chain);

    const cap = new BoxGeometry(capWidth, capHeight, capDepth);
    cap.translate(0, -drop + capOffset, 0);
    mount.push(cap);

    const cy = this.cageCenterY;
    const r = cageRadius;
    const top = new Vector3(0, cy + r * cageStretch, 0);
    const bottom = new Vector3(0, cy - r * cageStretch, 0);
    const px = new Vector3(r, cy, 0);
    const nx = new Vector3(-r, cy, 0);
    const pz = new Vector3(0, cy, r);
    const nz = new Vector3(0, cy, -r);

    const cageEdges: [Vector3, Vector3][] = [
      [top, px],
      [top, nx],
      [top, pz],
      [top, nz],
      [bottom, px],
      [bottom, nx],
      [bottom, pz],
      [bottom, nz],
      [px, pz],
      [pz, nx],
      [nx, nz],
      [nz, px],
    ];

    const cage = cageEdges.map(([from, to]) => barBetween(from, to, cageBarWidth));

    const mountMerged = mergeGeometries(
      mount.map((part) => part.toNonIndexed()),
      false,
    ) as BufferGeometry;
    const cageMerged = mergeGeometries(
      cage.map((part) => part.toNonIndexed()),
      false,
    ) as BufferGeometry;

    const parts = [mountMerged, cageMerged];

    if (inner) {
      const lamp = new OctahedronGeometry(cageRadius * innerScale, 0);
      lamp.scale(1, cageStretch, 1);
      lamp.translate(0, cy, 0);
      parts.push(lamp.toNonIndexed());
    }

    this.copy(mergeGeometries(parts, true) as BufferGeometry);
    this.computeBoundingSphere();
  }
}