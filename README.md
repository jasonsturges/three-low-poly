# Three.js Low Poly

Procedural tooling and parametric modeling for [Three.js]([Three.js](https://threejs.org))

![screen-capture](https://github.com/user-attachments/assets/3285ed9a-da3c-4287-ad2f-0c7e82cd70fd) _Example Library scene_

See the [example gallery](https://jasonsturges.com/three-low-poly/) for the full catalog of geometry, factory, reference, and studies.


## Getting started

```shell
npm i three-low-poly
```

Everything follows the same shape you already know from Three.js: construct with an options object, add it to the scene

### Geometry

The primary intent of the library: parametric `BufferGeometry` subclasses you pair with your own material and mesh, exactly like Three.js's built-in primitives.

```ts
import { Mesh, MeshStandardMaterial } from "three";
import { StarGeometry } from "three-low-poly";

const geometry = new StarGeometry({ points: 5, innerRadius: 0.5, outerRadius: 1 });
const material = new MeshStandardMaterial({ color: "#ffcc33", flatShading: true });
const star = new Mesh(geometry, material);
scene.add(star);
```

### Factory

this library favors merged geometry, material groups, and instancing so dense procedural scenes stay batch-friendly

```ts
import { scatterMossyRocks } from "three-low-poly";

const rocks = scatterMossyRocks({ count: 12, width: 8, depth: 8, seed: 1337 });
scene.add(rocks);
```

### Effect

Atmospheric layers animate off elapsed seconds — add them to the scene and call `update(dt)` each frame.

```ts
import { RainEffect } from "three-low-poly";

const rain = new RainEffect({ area: 12, height: 16, intensity: 0.45 });
scene.add(rain);

function animate(dt) {
  rain.update(dt);
  renderer.render(scene, camera);
}
```

## Vocabulary and Terminology

### Spatial & Kinematic Offsets

- **Lean:** Rotation relative to the resting vertical axis (pitch/roll). Represents tipping away from an upright rest state without requiring a fixed horizontal axis.
- **Twist:** Rotation about the vertical axis (yaw/heading). Represents facing a direction or re-orienting in place rather than deforming.
- **Sink:** Downward vertical displacement ($-Y$). A surface-aware offset that represents bedding or burying past a resting seat rather than an arbitrary raw translation.
- **Drift:** Planar displacement across the horizontal plane ($XZ$). Represents wandering away from a designated home point rather than a pair of disconnected coordinates.

### Directional & Relational Dimensions

- **Rise:** Additive vertical dimension measured upward from a lower reference point. Total height is derived from this addition.
- **Drop:** Subtractive vertical dimension measured downward from a top reference point. Inner clearance is derived by subtraction.
- **Gap:** Edge-to-edge (clearance) distance between adjacent elements in a series.
- **Inset:** Subtractive horizontal dimension measured inward from an outer boundary. Inner width is derived by subtraction.
- **Proud:** Positioned forward of, or projecting outward from, a flush reference surface.
- **Pitch:** Center-to-center distance between repeating elements or features in a series.

### Architectural & Profile Geometry

- **Springing:** The height or datum line on an arch where the curve departs from the vertical supports (jambs).
- **Sprung:** An installation state where a profile (such as crown molding) sits tilted across an interior angle, leaving a void behind it.
- **Rake:** An intentional incline, slope, or departure from the horizontal or vertical.
- **Sweep:** The path, curve, or motion vector along which a cross-section profile is extruded or revolved.
- **Cyma:** An S-shaped (ogee) architectural molding profile combining a convex and a concave curve.

### Repetition & Progression

* **Rank:** An ordered series of related elements treated as a single geometric arrangement, typically varying progressively in scale, form, or position.
* **Progression:** The rule or function governing continuous variation across a rank, such as linear, geometric, logarithmic, or eased change.
* **Cadence:** The discrete rhythm of a progression: the count, interval, or stepping by which successive members are sampled or placed.
* **Course:** A single linear or horizontal pass of elements within a larger arrangement, borrowed from masonry and construction.
* **Pitch:** Center-to-center distance between successive repeating elements.

### Spatial Domain & Bounds

* **Envelope:** The bounded 3D extent containing or constraining a geometric distribution, represented by a box, hull, sphere, or arbitrary volume.
* **Field:** A continuous spatial domain in which a value or influence is evaluated as a function of position, such as distance, density, potential, or noise.
* **Footprint:** The bounded 2D area occupied by, supporting, or constraining geometry when projected onto its reference plane.
* **Margin:** A prescribed clearance measured inward or outward from a boundary.
* **Girth:** The circumference or perimeter around a body or cross-section; a measure of extent rather than clearance.

### Distribution & Aggregation

* **Gather:** An attractive distribution in which elements converge toward one or more focal regions, producing localized concentrations and potentially overlapping mass.
* **Clump:** A localized high-density grouping produced by attraction, proximity, or shared spatial influence.
* **Strew:** A naturalistic, non-grid distribution of elements across a region without obvious alignment or regularity.
* **Scatter:** A general distribution of discrete elements across a region according to random, stochastic, or procedural placement.
* **Repulsion:** A spatial constraint or influence that drives neighboring elements apart to maintain separation.
* **Clearance:** The minimum permitted edge-to-edge distance between neighboring elements.
* **Packing:** The arrangement of elements within a bounded region subject to contact, clearance, density, or overlap constraints.

### Extremities & Convergence

* **Apex:** A terminal point or summit where edges, faces, or profiles converge opposite a base, as at the tip of a cone, pyramid, or pointed arch.
* **Base:** The supporting face, edge, loop, or footprint opposite an apex or upper extremity.
* **Cusp:** A singular point where a curve or surface converges sharply or changes direction; may form an inward or outward extremity.
* **Tip:** The terminal or outermost point of a narrow, tapered, or projecting feature.
* **Peak:** A localized maximum or summit, generally considered relative to surrounding geometry.

### Ridges, Valleys & Surface Form

* **Crest:** A narrow summit or line of maximum elevation along a profile, wave, thread, tooth, or surface.
* **Ridge:** An elongated region of locally maximal elevation extending along a surface.
* **Root:** The innermost or lowest region between adjacent projecting features, particularly teeth, threads, splines, and similar repeated profiles.
* **Trough:** An elongated region of locally minimal elevation, opposite a crest or ridge.
* **Valley:** A concave region lying between neighboring elevated regions or ridges.
* **Crown:** A broad convex rise, camber, or domed summit region of a surface rather than a singular point or narrow ridge.

Nouns describe structure and spatial relationships, verbs describe operations on form.

- gather a rank across a footprint
- apply a progression with a given cadence and pitch
- crown the profile
- inset the footprint
- sink the resulting geometry
- rake the course


## Geometry Symbols & Glyphs

Compact reference for geometric notation, diagram glyphs, computational geometry, and 2D / 3D graphics.

---

### Visual Geometry Glyphs

|                     | Glyphs              |                   | Glyphs                          |
| ------------------- |---------------------| ----------------- | ------------------------------- |
| **Axis / Dashed**   | `╎` `┆` `┊` `│`     | **Arc Quadrants** | `◜` `◝` `◞` `◟`                 |
| **Lines**           | `─` `│` `━` `┃`     | **Arcs**          | `⌒` `⌓` `◠` `◡`                 |
| **Rounded Corners** | `╭` `╮` `╰` `╯`     | **Half Circles**  | `◖` `◗`                         |
| **Square Corners**  | `┏` `┓` `┗` `┛`     | **Wedges**        | `◔` `◑` `◕` `◴` `◵` `◶` `◷`     |
| **Junctions**       | `┼` `├` `┤` `┬` `┴` | **Triangles**     | `▲` `▼` `◀` `▶` `◬` `◭` `◮`     |
| **Diagonals**       | `╱` `╲` `⟋` `⟍`     | **Quadrants**     | `◢` `◣` `◤` `◥`                 |
| **Vector Turns**    | `↳` `↵` `↱` `⤢` `⤡` | **Circles**       | `●` `○`                         |
| **Rotation**        | `↻` `↺` `↷` `↶` `⤸` | **Diamonds**      | `◆` `◇` `◊`                     |
| **Markers**         | `⌖` `✛`            | **Polygons**      | `⬟` `⬢` `⬠` `⬡`                 |
| **Quads**           | `▰` `▱` `⏢`         | **Directional**   | `↖` `↑` `↗` `←` `→` `↙` `↓` `↘` |

---

### Geometric Relationships & Measurement

| Symbol                     |  Glyph  | Common Geometric / 3D Use                                |
| -------------------------- |:-------:| -------------------------------------------------------- |
| **Angle**                  |   `∠`   | General angle notation                                   |
| **Measured Angle**         |   `∡`   | Angle with an indicated measurement                      |
| **Spherical Angle**        |   `∢`   | Spherical or spatial angle                               |
| **Right Angle**            |   `∟`   | Right angle, $90^\circ$                                  |
| **Perpendicular**          |   `⟂`   | Perpendicular lines, orthogonal vectors, surface normals |
| **Parallel**               | `∥` `⫽` | Parallel lines or vectors                                |
| **Not Parallel**           |   `∦`   | Non-parallel relationship                                |
| **Congruent**              |   `≅`   | Congruent geometric objects                              |
| **Similar**                | `∼` `≃` | Geometric similarity                                     |
| **Identical / Equivalent** |   `≡`   | Identity or equivalence                                  |
| **Degree**                 |   `°`   | Angular measurement in degrees                           |
| **Prime**                  |   `′`   | Arcminutes; feet in dimensional notation                 |
| **Double Prime**           |   `″`   | Arcseconds; inches in dimensional notation               |
| **Diameter**               |   `⌀`   | Diameter of a circle, cylinder, hole, etc.               |
| **Radius**                 | `r` `R` | Radius of a circle, sphere, arc, fillet, etc.            |

---

### Angles, Rotation & Trigonometry

| Symbol    |    Glyph    | Common Geometric / 3D Use                                                          |
| --------- | :---------: | ---------------------------------------------------------------------------------- |
| **Theta** |   `θ` `Θ`   | Primary planar or polar angle; rotation about an axis                              |
| **Phi**   | `φ` `ϕ` `Φ` | Azimuth or polar angle in spherical coordinates; convention varies                 |
| **Alpha** |     `α`     | Triangle angle; generic angular parameter                                          |
| **Beta**  |     `β`     | Triangle angle; generic angular parameter                                          |
| **Gamma** |     `γ`     | Triangle angle; Euler rotation                                                     |
| **Delta** |   `δ` `Δ`   | Change or difference; $\Delta x$, $\Delta y$, $\Delta\theta$                       |
| **Omega** |   `ω` `Ω`   | Angular velocity; solid angle                                                      |
| **Psi**   |     `ψ`     | Angular parameter; sometimes yaw or orientation                                    |
| **Rho**   |     `ρ`     | Radial distance in polar or spherical coordinates                                  |
| **Pi**    |     `π`     | Half turn, $180^\circ$; radians and circular geometry                              |
| **Tau**   |     `τ`     | Full turn, $360^\circ = 2\pi$; also commonly torque                                |
| **Sigma** |     `σ`     | Surface/area-related quantities; stress or standard deviation depending on context |

---

### Circular Geometry

| Symbol                |      Glyph      | Common Geometric / 3D Use              |
| --------------------- | :-------------: | -------------------------------------- |
| **Radius**            |     `r` `R`     | Distance from center to circumference  |
| **Diameter**          |   `d` `D` `⌀`   | Full width through the center          |
| **Circumference**     |       `C`       | Circumference of a circle              |
| **Arc Length**        |       `s`       | Length along a circular or curved path |
| **Angle**             |       `θ`       | Central or swept angle                 |
| **Pi**                |       `π`       | $\pi$ radians = half turn              |
| **Tau**               |       `τ`       | $\tau = 2\pi$ radians = full turn      |
| **Arc**               |     `⌒` `⌓`     | Visual arc / circular segment notation |
| **Upper / Lower Arc** |     `◠` `◡`     | Diagrammatic convex / concave arc      |
| **Half Circle**       |     `◖` `◗`     | Semicircular regions                   |
| **Quadrant Arc**      | `◜` `◝` `◞` `◟` | Quarter-circle curves                  |

---

### Mesh & Topology

| Symbol             |  Glyph / Notation  | Common Geometric / 3D Use                 |
| ------------------ | :----------------: | ----------------------------------------- |
| **Vertex**         | `v` `v₀` `v₁` `v₂` | Point belonging to a mesh                 |
| **Vertex Set**     |         `V`        | Set of all mesh vertices                  |
| **Edge**           |      `e` `e₀₁`     | Connection between two vertices           |
| **Edge Set**       |         `E`        | Set of all mesh edges                     |
| **Face**           |      `f` `f₀`      | Polygonal mesh face                       |
| **Face Set**       |         `F`        | Set of all mesh faces                     |
| **Triangle**       |    `△ABC` `ΔABC`   | Triangle defined by three vertices        |
| **Mesh**           |         `M`        | Polygonal or triangular mesh              |
| **Boundary**       |        `∂M`        | Boundary of a mesh, surface, or region    |
| **Element Of**     |         `∈`        | Membership, e.g. $v \in V$                |
| **Not Element Of** |         `∉`        | Non-membership                            |
| **Union**          |         `∪`        | Combination of sets or geometric regions  |
| **Intersection**   |         `∩`        | Intersection of sets or geometric regions |

---

### Vectors & Coordinate Frames

| Symbol            | Glyph / Notation | Common Geometric / 3D Use                        |
| ----------------- | :--------------: | ------------------------------------------------ |
| **Position**      |     `p` **p**    | Point or position vector                         |
| **Direction**     |     `d` **d**    | Direction vector                                 |
| **Normal**        |     `n` **n**    | Surface or vertex normal                         |
| **Tangent**       |     `t` **t**    | Tangent direction along a curve or surface       |
| **Bitangent**     |     `b` **b**    | Secondary tangent direction; tangent-space basis |
| **Up**            |     `u` **u**    | Local or world up direction                      |
| **Right**         |     `r` **r**    | Local right direction                            |
| **Forward**       |     `f` **f**    | Local forward/view direction                     |
| **Vector**        |       `v⃗`       | Generic directed quantity                        |
| **Unit Vector**   |       `v̂`       | Normalized vector                                |
| **Magnitude**     |       `‖v‖`      | Vector length                                    |
| **Dot Product**   |      `a · b`     | Projection, angle, orthogonality                 |
| **Cross Product** |      `a × b`     | Perpendicular vector; normals and orientation    |

---

### Coordinates & Parametric Geometry

| Symbol                            | Glyph / Notation | Common Geometric / 3D Use                   |
| --------------------------------- | :--------------: | ------------------------------------------- |
| **Cartesian Coordinates**         |    `x` `y` `z`   | Position along coordinate axes              |
| **Texture / Surface Coordinates** |      `u` `v`     | 2D parameterization of a surface            |
| **Parameter**                     |        `t`       | Position along a curve or interpolation     |
| **Interval**                      |    `t ∈ [0,1]`   | Normalized interpolation or parameter range |
| **Curve**                         |      `C(t)`      | Parametric curve                            |
| **Surface**                       |     `S(u,v)`     | Parametric surface                          |
| **Derivative**                    |      `C′(t)`     | Curve derivative / tangent                  |
| **Partial Derivative**            |  `∂S/∂u` `∂S/∂v` | Surface tangent directions                  |
| **Gradient**                      |       `∇f`       | Direction of greatest scalar-field increase |
| **Nabla**                         |        `∇`       | Gradient and other differential operators   |

---

### Transform & Rotation

| Symbol               | Glyph / Notation | Common Geometric / 3D Use                |
| -------------------- | :--------------: | ---------------------------------------- |
| **Translation**      |        `T`       | Translation transform or matrix          |
| **Rotation**         |        `R`       | Rotation transform or matrix             |
| **Scale**            |        `S`       | Scale transform or matrix                |
| **Transform**        |        `M`       | General transformation matrix            |
| **Identity**         |        `I`       | Identity matrix / transform              |
| **Inverse**          |       `M⁻¹`      | Inverse transformation                   |
| **Transpose**        |       `Mᵀ`       | Matrix transpose; normal transformations |
| **Quaternion**       |        `q`       | 3D orientation / rotation                |
| **Angle**            |        `θ`       | Rotation angle                           |
| **Axis**             |        `â`       | Unit rotation axis                       |
| **Clockwise**        |      `↻` `↷`     | Clockwise rotation                       |
| **Counterclockwise** |      `↺` `↶`     | Counterclockwise rotation                |

---

### Operators & Relations

| Symbol                      |  Glyph  | Common Geometric / Computational Use    |
| --------------------------- | :-----: | --------------------------------------- |
| **Approximately Equal**     |   `≈`   | Floating-point or approximate equality  |
| **Not Equal**               |   `≠`   | Inequality                              |
| **Less / Greater**          | `<` `>` | Ordering, bounds, winding tests         |
| **Less / Greater or Equal** | `≤` `≥` | Bounds and constraints                  |
| **Plus / Minus**            |   `±`   | Positive/negative offset or tolerance   |
| **Proportional To**         |   `∝`   | Proportional geometric relationship     |
| **Infinity**                |   `∞`   | Unbounded distance, limits              |
| **Element Of**              |   `∈`   | Set membership                          |
| **Maps To**                 |   `↦`   | Mapping one coordinate/value to another |
| **Arrow**                   |   `→`   | Direction, transformation, mapping      |
| **Therefore**               |   `∴`   | Logical consequence                     |
| **Because**                 |   `∵`   | Logical justification                   |

---

### Compact Glyph Palette

For quick copying while constructing diagrams:

- **Lines** — `─ │ ━ ┃ ╎ ┆ ┊`
- **Corners** — `╭ ╮ ╰ ╯ ┏ ┓ ┗ ┛`
- **Junctions** — `┼ ├ ┤ ┬ ┴`
- **Diagonals** — `╱ ╲ ⟋ ⟍`
- **Arcs** — `⌒ ⌓ ◠ ◡ ◜ ◝ ◞ ◟`
- **Circular** — `◖ ◗ ◔ ◑ ◕ ◴ ◵ ◶ ◷`
- **Triangles** — `▲ ▼ ◀ ▶ ◬ ◭ ◮ ◢ ◣ ◤ ◥`
- **Shapes** — `● ○ ◆ ◇ ◊ ⬟ ⬢ ⬠ ⬡ ▰ ▱ ⏢`
- **Turns** — `↳ ↵ ↱ ⤢ ⤡`
- **Rotation** — `↻ ↺ ↷ ↶ ⤸`
- **Direction** — `↖ ↑ ↗ ← → ↙ ↓ ↘`
- **Markers** — `⌖ ✛`
- **Angles** — `∠ ∡ ∢ ∟`
- **Relations** — `⟂ ⊥ ∥ ∦ ≅ ∼ ≃ ≡`
- **Circular Measures** — `r R d D ⌀ π τ θ °`
- **Greek / Angular** — `θ Θ φ ϕ Φ α β γ δ Δ ω Ω ψ ρ σ τ π`
- **Vector / Math** — `· × ‖ ‖ ∇ ∂ ∈ ∉ ∪ ∩ ≈ ≠ ≤ ≥ ± ∝ ∞`


## Symbology

**Coordinate Axes**

```text
  Local Space       Basic Axes       Labeled Axes                Negative Directions

      +Y                Y                Y (up)                         +Y
       |                |                |                               |
       |   +X           |                |                               |
       o----->          +---- X          o------- X (right)        -X ---+--- +X
      /                /                /                               /|
    +Z                /                /                               / |
                     Z                Z (forward)                    +Z  |
                                                                        -Y

```

Mesh Topology

```text
   Vertex           Edge                Face           UV Space          Triangle Shape     Center Division

     v0         v0 ------- v1            v1            (0,1)                   ^                   .
                                        /  \             +                    / \                 /|\
                                       /    \            |\                  /   \               / | \
                                      /      \           | \                /     \             /  |  \
                                    v0 ------ v2         |  \              /       \           /   |   \
                                                         +---+            +---------+         +----+----+
                                                       (0,0) (1,0)


   Standard Quad        Subdivided Quad       Triangle Strip       Quad Strip       Indexed Mesh

   v0 -------- v1        v0 -------- v1        ●───●───●            ●───●───●           0────1
   |         / |         | \       / |          ╲ ╱ ╲ ╱             │   │   │           │  ╱ │
   |       /   |         |   \   /   |           ●───●              ●───●───●           │ ╱  │
   |     /     |         |     C     |                                                  3────2
   |   /       |         |   /   \   |
   | /         |         | /       \ |
   v3 -------- v2        v3 -------- v2
                                                            Cube            Labeled Vertices

  Plane                      Plane Subdivisions           +-------+           4 -------- 7
                                                         /|      /|          /|         /|
  v0 ----------- v1          0 --- 1 --- 2 --- 3        + +-----+ |         5 -------- 6 |
   |              |          |     |     |     |        | |     | |         | |        | |
   |              |          4 --- 5 --- 6 --- 7        | +-----|-+         | 0 -------|-3
   |              |          |     |     |     |        |/      |/          |/         |/
  v3 ----------- v2          8 --- 9 -- 10 -- 11        +-------+           1 -------- 2
```

Plots

```text
      Sweep           Parametric Curve           Mapping              Parameter Space       Parametric Surface

                                                                    v ↑                        v ↑
   ●───╮                ●──╮                      (u,v)               | +---+                    │   ╱────╱
       ╰──╮                ╰──╮                     │                 | |   |                    │  ╱────╱
          ╰──→                ╰──●           ───────┼───────→         | +---+                    │ ╱────╱
                                                    │                 +------→ u                 └──────→ u


       Cartesian                 Vector Field                 Screen Space / UV Coordinate           Cartesian
                                 (● = Singularity)
    +Y ▲                                                    (0,0) ┌─────────────────► +U            ▲ +Y
   100 ┼      ● (x2,y2)       Y ▲                                 │                                 │
       │     ╱                  │  ↗   ↑   ↑   ↖   ←              │   (u, v)                        │    (x, y)
    50 ┼    ● (x1,y1)           │  →   ↗   ↑   ↖   ←              │     ●────────┐                  │      ┌────────┐
       │   ╱                    │  →   →   ●   ←   ←              │     │ Bounds │                  │      │ Bounds │
     0 └───┼───┼──► +X          │  →   ↘   ↓   ↙   ←              │     └────────┘                  │      ●────────┘
       0  50  100               │  ↘   ↓   ↓   ↙   ←              │                                 │
                              0 └───────────────────► X           ▼ +V                        (0,0) └──────────────────► +X
```




## Author

Jason Sturges
