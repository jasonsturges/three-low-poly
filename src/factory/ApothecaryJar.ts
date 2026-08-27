import { Group, Mesh, MeshStandardMaterial } from "three";
import { ApothecaryJarGeometry, type ApothecaryJarGeometryOptions } from "../geometry/vessels/ApothecaryJarGeometry";
import { CorkGeometry } from "../geometry/vessels/CorkGeometry";
import { createLiquidFill, type FillOptions } from "./liquidFill";

export interface ApothecaryJarOptions {
  /** Jar geometry — resize the body, neck, etc. The cork re-sizes and re-seats to the resulting rim. */
  jar?: ApothecaryJarGeometryOptions;
  /** Optional liquid inside the jar — colour, opacity, glow, fill level. */
  fill?: FillOptions;
  /** How far the cork seats into the neck, as a fraction of the cork's height. Defaults to `0.4`. */
  corkDrop?: number;
  /** Jar (glass) material. A translucent default is supplied. */
  glassMaterial?: MeshStandardMaterial;
  /** Cork material. A cork-brown default is supplied. */
  corkMaterial?: MeshStandardMaterial;
}

/**
 * Apothecary jar with a cork stopper — glass shell, a cork seated in the mouth, and an optional fill.
 *
 * A spatial factory, not a baked geometry: the glass is transparent, so shell, cork and liquid must be
 * SEPARATE meshes (transparency sorts per object). The cork is sized to the jar's rim and dropped into the
 * neck — the same measured-seating idea as {@link FlorenceFlaskStand}, so the cork always fits whatever
 * neck the jar is given. Rests on Y=0.
 */
export class ApothecaryJar extends Group {
  constructor({ jar, fill, corkDrop = 0.4, glassMaterial, corkMaterial }: ApothecaryJarOptions = {}) {
    super();

    const jarGeometry = new ApothecaryJarGeometry(jar);
    const rim = jarGeometry.profile[jarGeometry.profile.length - 1]!;
    const rimRadius = rim.x;
    const rimY = rim.y;
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

    // Cork sized to the rim: a plug just under the opening, a head just over it.
    const corkGeometry = new CorkGeometry({
      bottomRadius: rimRadius * 0.9,
      topRadius: rimRadius * 1.2,
      height: rimRadius * 1.4,
      radialSegments: segments,
    });
    const cork = new Mesh(
      corkGeometry,
      corkMaterial ?? new MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.9, metalness: 0, flatShading: true }),
    );
    cork.position.y = rimY - corkGeometry.height * corkDrop; // seated into the neck
    cork.castShadow = true;
    this.add(cork);
  }
}
