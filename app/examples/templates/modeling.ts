import {
  AxesHelper,
  BufferAttribute,
  BufferGeometry,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  TextureLoader,
} from "three";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";
import { createScene } from "../../framework/createScene";
import GUI from "lil-gui";

export const meta = {
  title: "Modeling",
  description:
    "Hand-built BufferGeometry with positions, normals, UVs, and indices. " +
    "Shows the vertex layout pattern used across the library's procedural geometries.",
};

/**
 * Teaching geometry — the left-hand side of a mitered picture frame, written out longhand.
 *
 *     3 ____
 *      |    \      outer edge (x = 0) runs the full height
 *      |    | 2    inner edge (x = 0.25) is cut back 45° at each end
 *      |    | 1
 *     0|____/
 *
 * Four parallel arrays, and the whole discipline of vertex modeling is in keeping them in step.
 * `positions[i]`, `normals[i]`, and `uvs[i]` must all describe THE SAME vertex, and `indices` must
 * reference them with the right winding. That is four independent chances to be wrong, with no
 * feedback until it looks odd on screen.
 *
 * Three traps live here, and each one is worth meeting once by hand:
 *
 * 1. WINDING — corners are listed counter-clockwise as seen from the side the normal faces. Reverse
 *    them and the face turns inside out, so backface culling makes it vanish silently. Any fan of a
 *    counter-clockwise ring is valid; the starting corner only decides which diagonal splits the quad.
 *
 * 2. UVs ARE A FUNCTION OF POSITION — a triangle interpolates UVs *linearly*, so a quad only reads
 *    seamlessly when all four (position → uv) pairs lie on ONE affine map. Here `uv = (x, y)`, which
 *    guarantees it. Give a corner a `v` that does not match its `y` and the two triangles solve for
 *    DIFFERENT maps: the texture stays joined at the seam but its gradient jumps, and straight lines in
 *    the grid visibly kink across the diagonal. That is the classic trapezoid crease, and it is why you
 *    can never squeeze a trapezoid into a 0–1 UV square — that is a projective transform, and triangles
 *    cannot represent one. Match the UV quad's SHAPE to the geometry's.
 *
 * 3. THE INDEX BUFFER — two triangles, sharing an edge. Get the order wrong and you get trap 1.
 */
class ModelingGeometry extends BufferGeometry {
  constructor() {
    super();

    // The vertex table. Counter-clockwise from the outer bottom, seen from +Z.
    const vertices = [
      0, 0, 0,        // 0  outer bottom
      0.25, 0.25, 0,  // 1  inner bottom — mitered in
      0.25, 0.75, 0,  // 2  inner top    — mitered in
      0, 1, 0,        // 3  outer top
    ];

    // Two triangles, split along the 1–3 diagonal. This is a fan from vertex 3.
    const indices = [
      0, 1, 3,
      1, 2, 3,
    ];

    // A flat face lying in XY, so every normal points +Z.
    const normals = [
      0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
    ];

    // uv = (x, y). Each pair matches its vertex above — which is the whole of trap 2.
    const uvs = [
      0, 0,          // 0  <- position (0,    0)
      0.25, 0.25,    // 1  <- position (0.25, 0.25)
      0.25, 0.75,    // 2  <- position (0.25, 0.75)
      0, 1,          // 3  <- position (0,    1)
    ];

    this.setAttribute("position", new BufferAttribute(new Float32Array(vertices), 3));
    this.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    this.setIndex(indices);
    this.addGroup(0, 6, 0);
  }
}

/** Contribution starter: custom geometry + helpers for debugging normals and axes. */
export default function (container: HTMLElement) {
  const { scene, dispose } = createScene(container);

  const geometry = new ModelingGeometry();
  const texture = new TextureLoader().load(`${import.meta.env.BASE_URL}uv-grid.jpg`);
  const material = new MeshStandardMaterial({ map: texture, side: FrontSide });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // If a normal ever points away from the camera-facing side, the winding is backwards.
  const normalsHelper = new VertexNormalsHelper(mesh, 1, 0xff0000);
  scene.add(normalsHelper);

  const axesHelper = new AxesHelper(5);
  scene.add(axesHelper);

  const gui = new GUI();

  return () => {
    gui.destroy();
    texture.dispose();
    geometry.dispose();
    material.dispose();
    normalsHelper.dispose();
    axesHelper.dispose();
    dispose();
  };
}
