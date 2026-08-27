import { Group, Mesh, MeshStandardMaterial } from "three";
import { type CorkGeometryOptions } from "../geometry/vessels/CorkGeometry";
import { WineBottleGeometry, type WineBottleGeometryOptions } from "../geometry/vessels/WineBottleGeometry";
import { createCorkStopper } from "./corkStopper";
import { createLiquidFill, type FillOptions } from "./liquidFill";

export interface WineBottleOptions {
  /** Bottle geometry — resize the body, neck, shoulder, etc. The cork re-sizes and re-seats to the rim. */
  bottle?: WineBottleGeometryOptions;
  /** Optional liquid inside the bottle — colour, opacity, glow, fill level. */
  fill?: FillOptions;
  /** Cork shape. Defaults to a long wine cork — a tall vertical body over a deep plug. */
  cork?: CorkGeometryOptions;
  /** How deep the cork sits: `0` = tip at the rim, `1` = the flat top flush. Defaults to `0.6`. */
  corkDepth?: number;
  /** Bottle (glass) material. A green-glass default is supplied. */
  glassMaterial?: MeshStandardMaterial;
  /** Cork material. A cork-brown default is supplied. */
  corkMaterial?: MeshStandardMaterial;
}

/**
 * Corked wine bottle — glass shell, a long wine cork, and an optional fill.
 *
 * The same spatial factory as {@link ApothecaryJar} and {@link PotionBottle}: transparent glass, so shell,
 * cork and liquid are separate meshes, and the cork is fitted and sealed by {@link createCorkStopper}. The
 * default cork is longer here — a tall vertical body over a deep plug, the way a wine cork actually is.
 * Rests on Y=0.
 */
export class WineBottle extends Group {
  constructor({ bottle, fill, cork, corkDepth, glassMaterial, corkMaterial }: WineBottleOptions = {}) {
    super();

    const bottleGeometry = new WineBottleGeometry(bottle);
    const segments = bottle?.radialSegments ?? 20;

    const shell = new Mesh(
      bottleGeometry,
      glassMaterial ?? new MeshStandardMaterial({ color: 0x3f6b4a, roughness: 0.18, transparent: true, opacity: 0.5 }),
    );
    shell.castShadow = true;
    shell.renderOrder = 1;
    this.add(shell);

    if (fill) {
      const liquid = createLiquidFill(bottleGeometry.profile, fill, segments);
      if (liquid) this.add(liquid);
    }

    // A long classical wine cork by default: a tall symmetric barrel (top === bottom, the `<>` bulge),
    // seated flush (depth 1).
    const wineCork: CorkGeometryOptions = { upperHeight: 1.2, lowerHeight: 1.2, topRadius: 0.72, bottomRadius: 0.72, ...cork };
    this.add(
      createCorkStopper(bottleGeometry.profile, bottle?.rim ?? 0.12, segments, {
        cork: wineCork,
        corkDepth: corkDepth ?? 1,
        material: corkMaterial,
      }),
    );
  }
}
