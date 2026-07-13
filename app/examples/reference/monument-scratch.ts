import GUI from "lil-gui";
import { AxesHelper, DoubleSide, Mesh, MeshStandardMaterial, RepeatWrapping, TextureLoader } from "three";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";
import {
  createGeometryBuffers,
  pushQuad,
  pushTriangle,
  toBufferGeometry,
  type Vec3,
} from "three-low-poly";
import { createOrthographicScene } from "../../framework/createOrthographicScene";

export const meta = {
  title: "Monument (scratch)",
  description: "TEMPORARY — learning pushQuad / pushTriangle. A tapered shaft under a pyramid cap.",
};

/**
 * A monument: a tapered four-sided shaft rising to a pyramid point. An obelisk, the Washington
 * Monument, or — the same shape at different proportions — a house with walls and a hipped roof.
 *
 * Three rings of vertices, and that is the whole model:
 *
 *                    apex            1 vertex
 *                   /    \
 *                  /      \          4 CAP TRIANGLES
 *                 /________\
 *                |          |        shoulder — 4 vertices
 *                |          |
 *                |          |        4 SIDE QUADS (trapezoids: the taper)
 *                |          |
 *                |__________|        base — 4 vertices
 *
 * The cap faces are TRIANGLES because they close to a single point. That is the whole reason
 * `pushTriangle` exists — a quad would need the apex twice.
 */
function buildMonument(baseWidth: number, topWidth: number, shaftHeight: number, capHeight: number) {
  const buffers = createGeometryBuffers();

  const b = baseWidth / 2;
  const t = topWidth / 2;

  // Walk the four corners in a consistent direction around the shaft. Every face is then built the
  // same way — corner i, corner i+1 — and the winding comes out right without thinking about it.
  const corners: [number, number][] = [
    [+1, +1], // SE
    [+1, -1], // NE
    [-1, -1], // NW
    [-1, +1], // SW
  ];

  const base: Vec3[] = corners.map(([sx, sz]) => [sx * b, 0, sz * b]);
  const shoulder: Vec3[] = corners.map(([sx, sz]) => [sx * t, shaftHeight, sz * t]);
  const apex: Vec3 = [0, shaftHeight + capHeight, 0];

  // How far the top edge of a side face pulls in from the bottom, as a fraction of the bottom's
  // width. The UVs inset by exactly this, so the UV quad is the same shape as the geometry quad.
  const inset = (1 - topWidth / baseWidth) / 2;

  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;

    // --- SIDE: a trapezoid, wider at the bottom than the top -------------------------------
    //
    // Corners wind counter-clockwise seen from OUTSIDE, so the derived normal points outward:
    //
    //   shoulder[i] ____ shoulder[next]      3 ____ 2
    //             /        \                  /      \
    //   base[i] /____________\ base[next]   0 /________\ 1
    //
    // The normal is left UNDEFINED on purpose. A tapered face is slanted — it is not simply +X or
    // +Z — so there is no axis-aligned normal to hand over. `pushQuad` derives it from the winding,
    // which is exactly the case `faceNormal` was written for.
    //
    // The UVs INSET at the top by the same ratio the geometry tapers. That is not decoration — a
    // triangle interpolates UVs linearly, so the four (position -> uv) pairs must lie on ONE affine
    // map or the two triangles solve for different ones and the texture visibly CREASES along the
    // diagonal. Stretching this trapezoid to fill a 0-1 square would be a projective transform,
    // which triangles cannot represent. Match the UV quad's SHAPE to the geometry's and it is
    // affine by construction.
    pushQuad(
      buffers,
      [base[i]!, base[next]!, shoulder[next]!, shoulder[i]!],
      undefined,
      [
        [0, 0], //          base[i]        -> bottom-left
        [1, 0], //          base[next]     -> bottom-right
        [1 - inset, 1], //  shoulder[next] -> inset, tracking the taper
        [inset, 1], //      shoulder[i]    -> inset, tracking the taper
      ],
    );

    // --- CAP: a triangle closing to the apex ------------------------------------------------
    //
    //            apex  (0.5, 1)
    //             /\
    //            /  \
    //           /____\
    //  shoulder[i]   shoulder[next]
    //   (0,0)             (1,0)
    //
    // Same winding rule, same derived normal. The apex UV sits at the top CENTER, so the texture
    // converges to a point the way the geometry does.
    pushTriangle(
      buffers,
      [shoulder[i]!, shoulder[next]!, apex],
      undefined,
      [
        [0, 0],
        [1, 0],
        [0.5, 1],
      ],
    );
  }

  // 4 side quads (2 triangles each) + 4 cap triangles = 12 triangles, 20 vertices.
  return toBufferGeometry(buffers);
}

export default function (container: HTMLElement) {
  const { scene, dispose } = createOrthographicScene(container, { frustumSize: 4 });

  const params = {
    baseWidth: 2,
    topWidth: 1.2,
    shaftHeight: 3,
    capHeight: 1.2,
    showNormals: true,
  };

  const texture = new TextureLoader().load(`${import.meta.env.BASE_URL}uv-grid.jpg`);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  const material = new MeshStandardMaterial({
    map: texture,
    side: DoubleSide,
    roughness: 0.9,
    flatShading: true,
  });

  let monument = new Mesh(
    buildMonument(params.baseWidth, params.topWidth, params.shaftHeight, params.capHeight),
    material,
  );
  let normals: VertexNormalsHelper | null = null;

  const rebuild = () => {
    if (normals) scene.remove(normals);
    monument.geometry.dispose();
    scene.remove(monument);

    monument = new Mesh(
      buildMonument(params.baseWidth, params.topWidth, params.shaftHeight, params.capHeight),
      material,
    );
    scene.add(monument);

    // Normals point away from the shaft and up the cap — if any point inward, a face is wound
    // backwards and would vanish under backface culling.
    normals = new VertexNormalsHelper(monument, 0.3, 0xff3355);
    if (params.showNormals) scene.add(normals);
  };

  rebuild();
  scene.add(new AxesHelper(2));

  const gui = new GUI();
  gui.add(params, "baseWidth", 0.5, 4, 0.05).name("Base Width").onChange(rebuild);
  gui.add(params, "topWidth", 0.1, 4, 0.05).name("Top Width").onChange(rebuild);
  gui.add(params, "shaftHeight", 0.2, 6, 0.05).name("Shaft Height").onChange(rebuild);
  gui.add(params, "capHeight", 0.1, 4, 0.05).name("Cap Height").onChange(rebuild);
  gui.add(params, "showNormals").name("Show Normals").onChange(rebuild);

  return () => {
    gui.destroy();
    monument.geometry.dispose();
    material.dispose();
    texture.dispose();
    dispose();
  };
}
