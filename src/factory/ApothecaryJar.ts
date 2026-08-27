import { Group, Mesh, MeshStandardMaterial } from "three";
import { ApothecaryJarGeometry, type ApothecaryJarGeometryOptions } from "../geometry/vessels/ApothecaryJarGeometry";
import { type CorkGeometryOptions } from "../geometry/vessels/CorkGeometry";
import { createCorkStopper } from "./corkStopper";
import { createLiquidFill, type FillOptions } from "./liquidFill";

export interface ApothecaryJarOptions {
  /** Jar geometry — resize the body, neck, etc. The cork re-sizes and re-seats to the resulting rim. */
  jar?: ApothecaryJarGeometryOptions;
  /** Optional liquid inside the jar — colour, opacity, glow, fill level. */
  fill?: FillOptions;
  /** Cork shape — vertical cap height (`upperHeight`), plug depth (`lowerHeight`), tip radius. */
  cork?: CorkGeometryOptions;
  /** How deep the cork sits: `0` = tip at the rim, `1` = the flat top flush. Defaults to `0.6`. */
  corkDepth?: number;
  /** Jar (glass) material. A translucent default is supplied. */
  glassMaterial?: MeshStandardMaterial;
  /** Cork material. A cork-brown default is supplied. */
  corkMaterial?: MeshStandardMaterial;
}

/**
 * Apothecary jar with a cork stopper — glass shell, a fitted cork lid, and an optional fill.
 *
 * A spatial factory, not a baked geometry: the glass is transparent, so shell, cork and liquid must be
 * SEPARATE meshes (transparency sorts per object). The cork is fitted to the jar's opening and sealed at
 * any depth by {@link createCorkStopper} — the same measured-seating idea as {@link FlorenceFlaskStand}.
 * Rests on Y=0.
 */
export class ApothecaryJar extends Group {
  constructor({ jar, fill, cork, corkDepth, glassMaterial, corkMaterial }: ApothecaryJarOptions = {}) {
    super();

    const jarGeometry = new ApothecaryJarGeometry(jar);
    const segments = jar?.radialSegments ?? 20;

    const shell = new Mesh(
      jarGeometry,
      glassMaterial ?? new MeshStandardMaterial({ color: 0xbfe3e0, roughness: 0.15, transparent: true, opacity: 0.4 }),
    );
    shell.castShadow = true;
    shell.renderOrder = 1; // glass after the liquid
    this.add(shell);

    if (fill) {
      const liquid = createLiquidFill(jarGeometry.profile, fill, segments);
      if (liquid) this.add(liquid);
    }

    this.add(createCorkStopper(jarGeometry.profile, jar?.rim ?? 0.15, segments, { cork, corkDepth, material: corkMaterial }));
  }
}
