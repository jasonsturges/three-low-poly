import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createGeometryBuffers,
  pushQuad,
  toBufferGeometry,
  type Vec2,
  type Vec3,
} from "../../utils/GeometryBuffers";

export interface BookGeometryOptions {
  /** Cover width, spine to fore-edge. Defaults to `1`. */
  width?: number;
  /** Cover height. Defaults to `1.5`. */
  height?: number;
  /** Spine depth, cover to cover. Defaults to `0.5`. */
  depth?: number;
  /** Cover board thickness. Defaults to `0.05`. */
  coverThickness?: number;
  /** Inset of the page block from the cover edges. Defaults to `0.05`. */
  pageIndent?: number;
}

/** Material slot for the cover shell. */
export const BOOK_COVER_MATERIAL = 0;
/** Material slot for the page block. */
export const BOOK_PAGES_MATERIAL = 1;

/**
 * A closed book — cover shell (group 0) and page block (group 1), merge-baked into one geometry.
 *
 * Fourteen quads make the shell: three outer boards, three inner faces, three top edges, three bottom
 * edges, and the two fore-edges. The inner faces are what make it a SHELL rather than a slab — a book
 * seen from its fore-edge shows the inside of both boards and the page block held between them.
 *
 * Local frame: **spine at X = 0, fore-edge at +X, sitting on Y = 0**, with the book extending to −Z. Not
 * centred in XZ, and deliberately: books are placed against each other, so the spine is the useful
 * anchor. A row lays them out along Z; a shelf stands them along X.
 *
 * ## The two groups are the point
 *
 * A cover is red and its pages are white, so the two need different materials — and merging them with
 * groups is what keeps a single book to one geometry and one draw pair. It also rules something out:
 * Three's `InstancedMesh` carries ONE colour per instance for the whole object, so a shelf of books with
 * differently coloured spines cannot be a single instanced mesh here. (Metal can do it — `setColorAt`
 * against a material group — which is why the Swift port of this reads differently.) Merging a whole
 * shelf into one baked geometry is the way that works here, and it is what the row and stack factories
 * do.
 *
 * ## The cover UV wraps front to back
 *
 * `u` runs continuously across **back cover → spine → front cover**, in proportion to `2·width + depth`,
 * so the three outer boards share one unbroken 0→1 span. That is the layout a real dust jacket is
 * printed on: one flat sheet, folded around the boards. Apply a paper texture and it wraps correctly
 * across the spine instead of restarting at every face.
 *
 * The three INNER faces carry the same spans reversed, so a texture continues around the fold rather
 * than mirroring at it. The edge, top and bottom strips take a plain 0→1: they are thin, and nothing on
 * a jacket is registered to them.
 *
 * @example
 * ```ts
 * const book = new Mesh(new BookGeometry({ depth: 0.32 }), [
 *   new MeshStandardMaterial({ color: 0x8c2f2f, roughness: 0.62 }), // cover
 *   new MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.92 }), // pages
 * ]);
 * ```
 */
export class BookGeometry extends BufferGeometry {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly coverThickness: number;
  readonly pageIndent: number;

  constructor({
    width = 1,
    height = 1.5,
    depth = 0.5,
    coverThickness = 0.05,
    pageIndent = 0.05,
  }: BookGeometryOptions = {}) {
    super();

    this.width = width;
    this.height = height;
    this.depth = depth;
    this.coverThickness = coverThickness;
    this.pageIndent = pageIndent;

    const w = width;
    const h = height;
    const d = depth;
    const t = coverThickness;
    const i = pageIndent;

    // The jacket's two folds, as fractions of the flat sheet `2w + d`. Everything the cover UV does is
    // these two numbers: back cover [0, u1], spine [u1, u2], front cover [u2, 1].
    const sheet = w * 2 + d;
    const u1 = w / sheet;
    const u2 = (w + d) / sheet;

    const buffers = createGeometryBuffers();

    /**
     * One planar quad of the shell.
     *
     * The normal is left to the winding rather than transcribed. For a planar quad the two are identical,
     * and it removes a parallel table that has to be kept in step by hand — the original carried fifty-six
     * normals written out longhand beside fifty-six positions.
     */
    const quad = (corners: [Vec3, Vec3, Vec3, Vec3], uvs: [Vec2, Vec2, Vec2, Vec2]) =>
      pushQuad(buffers, corners, undefined, uvs);

    /** A thin strip — edges, tops and bottoms. Nothing on a jacket registers to these. */
    const STRIP: [Vec2, Vec2, Vec2, Vec2] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];

    //  Outer boards. Their `u` spans are the jacket, unbroken from back through spine to front.
    quad(
      [[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0]],
      [[u2, 0], [1, 0], [1, 1], [u2, 1]],
    ); // front cover
    quad(
      [[w, 0, -d], [0, 0, -d], [0, h, -d], [w, h, -d]],
      [[0, 0], [u1, 0], [u1, 1], [0, 1]],
    ); // back cover
    quad(
      [[0, 0, -d], [0, 0, 0], [0, h, 0], [0, h, -d]],
      [[u1, 0], [u2, 0], [u2, 1], [u1, 1]],
    ); // spine

    //  Inner faces of the boards — what makes this a shell and not a slab. Their spans run the other
    //  way, so a jacket texture carries around the fold rather than mirroring at it.
    quad(
      [[w, 0, -t], [t, 0, -t], [t, h, -t], [w, h, -t]],
      [[1, 0], [u2, 0], [u2, 1], [1, 1]],
    ); // inside front
    quad(
      [[t, 0, -d + t], [w, 0, -d + t], [w, h, -d + t], [t, h, -d + t]],
      [[u1, 0], [0, 0], [0, 1], [u1, 1]],
    ); // inside back
    quad(
      [[t, 0, -t], [t, 0, -d + t], [t, h, -d + t], [t, h, -t]],
      [[u2, 0], [u1, 0], [u1, 1], [u2, 1]],
    ); // inside spine

    //  Top edges of the three boards.
    quad([[0, h, 0], [w, h, 0], [w, h, -t], [t, h, -t]], [[u2, 0], [1, 0], [1, 1], [u2, 1]]);
    quad([[0, h, -d], [t, h, -d + t], [w, h, -d + t], [w, h, -d]], STRIP);
    quad([[0, h, 0], [t, h, -t], [t, h, -d + t], [0, h, -d]], STRIP);

    //  Bottom edges.
    quad([[0, 0, 0], [t, 0, -t], [w, 0, -t], [w, 0, 0]], STRIP);
    quad([[0, 0, -d], [w, 0, -d], [w, 0, -d + t], [t, 0, -d + t]], STRIP);
    quad([[0, 0, 0], [0, 0, -d], [t, 0, -d + t], [t, 0, -t]], STRIP);

    //  Fore-edges of the two boards — the open side of the book.
    quad([[w, 0, 0], [w, 0, -t], [w, h, -t], [w, h, 0]], STRIP);
    quad([[w, 0, -d], [w, h, -d], [w, h, -d + t], [w, 0, -d + t]], STRIP);

    const shell = toBufferGeometry(buffers);

    // The page block, inset from the boards on every side. A box today; see `docs/books.md` for the
    // curved fore-edge a real block has.
    const pages = new BoxGeometry(w - t - i, h - i * 2, d - t * 2);
    pages.translate((w - t - i) / 2 + t, h / 2, -d / 2);

    // `true` keeps the two as separate groups rather than flattening them, which is the whole reason
    // this is one geometry instead of two meshes.
    const merged = mergeGeometries([shell, pages], true);
    shell.dispose();
    pages.dispose();
    if (merged) {
      this.copy(merged);
      merged.dispose();
    }
  }
}
