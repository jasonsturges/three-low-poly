import { Group, Mesh, MeshStandardMaterial } from "three";
import { type CorkGeometryOptions } from "../geometry/vessels/CorkGeometry";
import { PotionBottleGeometry, type PotionBottleGeometryOptions } from "../geometry/vessels/PotionBottleGeometry";
import { createCorkStopper } from "./corkStopper";
import { createLiquidFill, type FillOptions } from "./liquidFill";

export interface PotionBottleOptions {
  /** Bottle geometry — resize the body, neck, etc. The cork re-sizes and re-seats to the resulting rim. */
  bottle?: PotionBottleGeometryOptions;
  /** Optional liquid inside the bottle — colour, opacity, glow, fill level. */
  fill?: FillOptions;
  /** Cork shape — vertical cap height (`upperHeight`), plug depth (`lowerHeight`), tip radius. */
  cork?: CorkGeometryOptions;
  /** How deep the cork sits: `0` = tip at the rim, `1` = the flat top flush. Defaults to `0.6`. */
  corkDepth?: number;
  /** Bottle (glass) material. A translucent default is supplied. */
  glassMaterial?: MeshStandardMaterial;
  /** Cork material. A cork-brown default is supplied. */
  corkMaterial?: MeshStandardMaterial;
}

/**
 * Stoppered potion bottle — glass shell, a fitted cork, and an optional bright fill.
 *
 * The same spatial factory as {@link ApothecaryJar}: transparent glass, so shell, cork and liquid are
 * separate meshes, and the cork is fitted and sealed at any depth by {@link createCorkStopper}. Rests on
 * Y=0.
 */
export class PotionBottle extends Group {
  constructor({ bottle, fill, cork, corkDepth, glassMaterial, corkMaterial }: PotionBottleOptions = {}) {
    super();

    const bottleGeometry = new PotionBottleGeometry(bottle);
    const segments = bottle?.radialSegments ?? 20;

    const shell = new Mesh(
      bottleGeometry,
      glassMaterial ?? new MeshStandardMaterial({ color: 0xc7bce0, roughness: 0.15, transparent: true, opacity: 0.4 }),
    );
    shell.castShadow = true;
    shell.renderOrder = 1;
    this.add(shell);

    if (fill) {
      const liquid = createLiquidFill(bottleGeometry.profile, fill, segments);
      if (liquid) this.add(liquid);
    }

    this.add(createCorkStopper(bottleGeometry.profile, bottle?.rim ?? 0.15, segments, { cork, corkDepth, material: corkMaterial }));
  }
}
