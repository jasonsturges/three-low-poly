import { BufferGeometry, CylinderGeometry } from "three";

export interface PestleGeometryOptions {
  /** Overall length, head to grip. Defaults to `1.5`. */
  height?: number;
  /** Radius of the grinding head — the fat end that meets the mortar. Defaults to `0.3`. */
  headRadius?: number;
  /** Radius of the grip — the end you hold. Defaults to `0.2`. */
  gripRadius?: number;
  /** Sides around the shaft. `6` reads as hand-cut stone. Defaults to `8`. */
  radialSegments?: number;
}

/**
 * Pestle — the grinding tool that works a {@link MortarGeometry}.
 *
 * The **head is the wide end and it is at the bottom**, because that is how a pestle rests when it is
 * not in your hand: standing on the part that does the work. A pestle used in anger sits head-down in
 * the bowl, so this frame is also the one an assembly wants to place from.
 *
 * Local frame: head at Y=0, grip at `+height`, centered on X and Z.
 *
 * The assembled pair — a pestle seated and leaning in the bowl — belongs to a future
 * `mortarAndPestle()` factory, not to either geometry. See the TODO on {@link MortarGeometry}.
 *
 * @example
 * ```ts
 * const geometry = new PestleGeometry({ height: 1.5, headRadius: 0.3 });
 * const pestle = new Mesh(geometry, stoneMaterial);
 * scene.add(pestle);
 * ```
 */
export class PestleGeometry extends BufferGeometry {
  readonly height: number;
  readonly headRadius: number;
  readonly gripRadius: number;

  constructor({
    height = 1.5,
    headRadius = 0.3,
    gripRadius = 0.2,
    radialSegments = 8,
  }: PestleGeometryOptions = {}) {
    super();

    this.height = height;
    this.headRadius = headRadius;
    this.gripRadius = gripRadius;

    // TODO: THE HEAD SHOULD BE ROUNDED, not a flat-cut cone. A pestle grinds with a domed face that
    // matches the bowl's curve; a flat disc only ever contacts at its rim. Two candidate approaches:
    //
    //   1. A LATHE PROFILE — the same tool MortarGeometry uses, and the one that generalizes. It also
    //      gets the club silhouette for free: a slim grip swelling into the head, which is what a real
    //      pestle looks like and what a cone cannot express at all.
    //   2. A CAPSULE with the grip end cut flat — cheaper, but it only buys the dome, not the club,
    //      and the flat cut has to be authored anyway.
    //
    // The lathe is the better answer for the same reason it is in the mortar: the profile IS the
    // parameterization. Kept as a cone for now purely so the split from the old prefab changed nothing
    // visually.
    const shaft = new CylinderGeometry(gripRadius, headRadius, height, radialSegments);
    shaft.translate(0, height / 2, 0);

    this.copy(shaft);
    shaft.dispose();
  }
}
