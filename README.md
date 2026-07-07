# Three.js Low Poly

Create or enhance stylized low-poly scenes entirely through code using procedurally generated geometries, prefabricated models, factory utilities, and atmospheric layers for [Three.js](https://threejs.org).

See the [example gallery](https://jasonsturges.com/three-low-poly/) for the full catalog of models, effects, and composed scenes. Local dev: `npm run host`.

![screen-capture](https://github.com/user-attachments/assets/3285ed9a-da3c-4287-ad2f-0c7e82cd70fd)
_Example Library scene_

## Overview

This is an alternative to a modeling pipeline using external DCC tools: author in code via procedural and parametric geometry. Splines, lathe, extrude, parabolic profiles expressing geometry as algorithms.  Vertex-built geometry, prefab models, and factory assemblies are first-class.

Most adopters will likely import their own assets (glTF, etc.) and use this library as scene enhancement rather than a full replacement for modeling software. This library spans both worlds.

"Low poly" describes the aesthetic, not the whole thesis.  Intention is code-first, parametric, performant scene building. Exported assets often mean one draw call per mesh; this library favors merged geometry, material groups, and instancing so dense procedural scenes stay batch-friendly, a deliberate contrast to typical glTF import cost.

### Core principles

- **Procedural generation**: geometry from algorithms, not imported meshes
- **Parametric modeling**: size, color, detail, and variation controlled via options
- **Prefabricated models**: drop-in objects (trees, jars, books) ready for `scene.add()`
- **Factory utilities**: assemblies and fills (rows, grids, tiled floors) from one call
- **Instanced layers**: weather, scatter, and particles via `InstancedMesh` / `Points`
- **Time-based animation**: driven by elapsed seconds, not per-frame magic numbers

## Modeling

Vertex modeling is preferred over relying on built-in primitives, using geometry groups when a mesh needs multiple materials. Profile-based tools (splines, lathe, extrude, parabolic curves) cover most organic and architectural shapes; NURBS surfaces are exploratory, for cases where profile tools fall short.

Where it makes sense, geometry is authored as its own class mirroring how Three.js structures its own `BufferGeometry` subclasses, rather than building shapes inline wherever they're used. That keeps geometry reusable and consistent with how the rest of the ecosystem expects to work with it.

## Models, factories, and instancing

Two distinct shapes of API exist, and the distinction is intentional:

- **Models ("prefabs")** are stable, ready-to-place objects - geometry plus materials combined into something you just add to a scene. Use these when the artifact itself is the thing you want.
- **Factories** build assemblies or fill an area - a row of books, a floor of hex tiles, a fence along a path. Use these when the artifact is a composition of many parts rather than a single object.

Dense or repeated elements (tiles, books, particles, weather) lean on `InstancedMesh` rather than individual meshes, which is where most of the performance comes from. Batching and merge opportunities are still handled case-by-case rather than enforced everywhere, so there's room to be deliberate about it when adding new factories.

## Atmosphere and effect layers

Anything that moves, flickers, or drifts falls into one of three categories, distinguished by how long it lasts, what it's scoped to, and what triggers it. This taxonomy matters more than it might first appear - it's the difference between something that's always running in the background versus something that fires once and finishes, and it should hold as the library grows:

- **Environment**: continuous, scene- or region-scale, generally always on (rain, fog, lightning, a starfield sky dome). These set the atmosphere for the whole scene rather than belonging to any one object.
- **Ambience**: continuous, but scoped to a volume or bound to a specific prop (bubbles in a jar, petals drifting through a yard, a flickering flame). Same always-on lifecycle as environment layers, just localized rather than global.
- **FX**: short-lived and event-triggered (dust kicked up on landing, a spell flash). Not just a smaller environment layer - the lifecycle is fundamentally different: it starts on `trigger()`, runs once, and ends, rather than running continuously via `update(dt)`.

## Conventions

A few patterns hold consistently across the library, and are worth following when contributing or extending it:

- **Options objects**: public APIs take a `Options` interface (exported alongside the class) rather than positional arguments, with defaults set via destructuring and each field documented.
- **Animation**: anything that moves exposes `update(dt)` where `dt` is elapsed seconds, not a frame-rate-dependent step.
- **Disposal**: anything owning geometry, materials, or textures exposes `dispose()`.
- **Documentation**: every public class gets a doc comment with a minimal setup snippet, enough to wire it up without reading the source.
- **Examples**: every feature has a matching example in the host gallery, so behavior can be seen in motion, not just read about.
- **Randomness**: variation is unique per runtime by default (plain `Math.random()`); seeded, reproducible randomness is on the roadmap, not yet wired through.

## Getting started

```shell
npm i three-low-poly
```

Everything follows the same shape you already know from Three.js: construct with an options object, add it to the scene, and — if it animates — call `update(dt)` from your render loop.

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

### Prefab

The same shape as a ready-made model — geometry and materials already wired. Drop it straight into the scene.

```ts
import { Star } from "three-low-poly";

const star = new Star({ points: 5, color: "#ffcc33" });
scene.add(star);
```

### Factory

Assemble or scatter many parts from a single call.

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

## Author

Jason Sturges, procedural low-poly tooling for Three.js.
