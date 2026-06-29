# Three.js Low Poly

Create or enhance stylized low-poly scenes entirely through code — procedurally generated geometries, prefabricated models, factory utilities, and atmospheric layers for [Three.js](https://threejs.org).

> **How to use this document** — Start here for intent, conventions, and direction. The [example gallery](https://jasonsturges.com/three-low-poly/) and TypeScript exports are the API reference; this file is the mental model. Written for humans first, structured so an AI collaborator can pick up full context from one read.

**Contents:** [What this is](#what-this-library-is) · [Mental model](#mental-model) · [Usage patterns](#usage-patterns) · [Conventions](#conventions-library-code) · [Current state](#current-state) · [Design patterns (target)](#design-patterns-target) · [Roadmap](#roadmap) · [Getting started](#getting-started)

---

## What this library is

### Origin

An alternative to the Blender → export → load pipeline. Model in code via **procedural** and **parametric** geometry instead of external DCC tools. Splines, lathe, extrude, parabolic profiles — geometry as algorithms, not hand-authored meshes.

### Practical reality

Most adopters will import their own assets (glTF, etc.) and use this library as **scene enhancement** — blowing leaves, rain, lightning, effervescence in a jar, procedural fill on a shelf — not as a full replacement for modeling software. That is expected and supported.

There is still real **modeling capability** here: vertex-built geometry, prefab models, and factory assemblies are first-class. The library spans both worlds.

### Style

Generally low-poly and stylized, but “low poly” describes the aesthetic, not the whole thesis. The thesis is **code-first, parametric, performant scene building**.

### Performance

Exported assets often mean **one draw call per mesh**. This library favors **merged geometry, material groups, and instancing** so dense procedural scenes stay batch-friendly — a deliberate contrast to typical glTF import cost.

### Core principles

| Principle | Meaning |
|-----------|---------|
| **Procedural generation** | Geometry from algorithms, not imported meshes |
| **Parametric modeling** | Size, color, detail, and variation via options interfaces |
| **Prefabricated models** | Drop-in `Mesh` subclasses (trees, jars, books) ready for `scene.add()` |
| **Factory utilities** | Assemblies and fills (book rows, tile floors, walls) from one call |
| **Instanced layers** | Weather, scatter, and particles via `InstancedMesh` / `Points` |
| **Time-based animation** | `update(dt)` in seconds, not per-frame magic numbers |
| **Unique runtime, optional repeatability** | Stochastic variation by default; seeded reproducibility is roadmap (see below) |

![screen-capture](https://github.com/user-attachments/assets/3285ed9a-da3c-4287-ad2f-0c7e82cd70fd)
_Example Library scene_

---

## Mental model

### Package layers (where code lives)

| Layer | Role | Examples |
|-------|------|----------|
| **Geometry** | Building blocks; prefer when mirroring Three.js patterns | `JarGeometry`, `TestTubeGeometry`, `BrickGeometry` |
| **Models (“prefabs”)** | Geometry + materials as ready-to-place objects | `Jar`, `Tree`, `TestTube`, `Mausoleum` |
| **Factories** | Composite assemblies and **fills** along extent | `rowOfBooksByCount`, `createHexagonalTilesByRadius` |
| **Environment** | Continuous scene- or region-scale atmosphere | `StarFieldEffect`, `RainEffect`, `LightningEffect`, `GroundFogEffect` |
| **Ambience** | Continuous layers, often volume- or prop-bound | `PetalDriftEffect`, `EffervescenceEffect`, `WispEffect`, `EmissivePulseEffect`, `FlameFlickerEffect`, `GlowHalo` |
| **FX** *(planned)* | Short-lived, event-triggered bursts | Dust on landing, spell flash, wind streak *(not in SDK yet)* |
| **Animators** | Camera showcase playback (Unity demo-scene style) | `CameraPlayback`, `createOrbitClip`, `createFlythroughClip` |
| **Utilities** | Math, easing, centering, RNG | `Easing`, `randomFloat`, `centerObject` |

**Model examples** showcase geometry. **Effect examples** showcase layers. **Scene examples** compose both (e.g. Mad Science: jar + effervescence).

### Visual layers — duration, scope, trigger

Use this frame when adding anything that moves, flickers, or spawns. **Preserve this taxonomy** when extending the library:

| Category | Duration | Scope | Trigger | Examples |
|----------|----------|-------|---------|----------|
| **VFX / FX** | Short, often one-shot | Local to an event | `play()`, `trigger()` | Dust on landing, spell flash, impact sparks |
| **Environment / weather** | Continuous | Scene or region | Always on (toggle optional) | Rain, fog, lightning, starfield |
| **Ambient detail** | Continuous | Volume or prop-adjacent | Scene setup | Petals in a yard, bubbles in a jar |

**Today:** Environment and ambience live under `src/effects/`. FX is roadmap-only; future FX will use `trigger()` + short lifetime, not only `update(dt)`.

| Export | Category | Notes |
|--------|----------|-------|
| `StarFieldEffect` | Environment | Sky dome; copy camera position each frame |
| `RainEffect` | Environment | Regional rainfall volume |
| `LightningEffect` | Environment | Drives `DirectionalLight`; expose `level` for fog/sky sync |
| `GroundFogEffect` | Environment | Drifting mist cards; interior + optional perimeter patches |
| `PetalDriftEffect` | Ambience | Scene volume or localized patch |
| `WispEffect` | Ambience | Drifting will-o'-the-wisps in a bounded volume |
| `EffervescenceEffect` | Ambience | Scale/position inside vessels; `spread` for round vessels |
| `EmissivePulseEffect` | Ambience | Drives `emissiveIntensity` on existing materials (fake LED); no geometry |
| `GlowHalo` | Ambience | Additive billboard glow; fake light without `PointLight` |
| `FlameFlickerEffect` | Ambience | Sine flicker driver for halo, flame material, optional real light |

### Modeling conventions

- Prefer **vertex modeling** in geometry classes; use **geometry groups** for multi-material meshes.
- Profile tools: splines, lathe, extrude, parabolic curves; NURBS is exploratory.
- Use **geometry classes** where Three.js would use `BufferGeometry` subclasses.
- Use **models** when the artifact is a stable prefab; use **factories** when the artifact is an assembly or a fill along extent.

### Glass and transparent contents

Transparent glass + liquid + instanced contents are a recurring pattern:

- Glass and liquid: `transparent: true`, `depthWrite: false`, `side: DoubleSide`
- Draw order: contents → liquid (`renderOrder` 1) → glass (`renderOrder` 2)
- See `TestTubeRack`, effervescence example, and mad-science scene patterns

---

## Usage patterns

### Drop-in model

```ts
import { MossyRocks } from "three-low-poly";

const rocks = new MossyRocks();
scene.add(rocks);
```

### Environment layer

```ts
import { RainEffect } from "three-low-poly";

const rain = new RainEffect({ area: 12, height: 16, intensity: 0.45 });
scene.add(rain);

function animate(dt: number) {
  rain.update(dt);
  renderer.render(scene, camera);
}
```

### Lightning + synced atmosphere

```ts
const bolt = new DirectionalLight(0xcdd8ff, 0);
bolt.position.set(5, 12, -8);
bolt.target.position.set(0, 2, 0);
scene.add(bolt, bolt.target);

const storm = new LightningEffect({ light: bolt, peak: 12, minGap: 3, maxGap: 9 });

function animate(dt: number) {
  storm.update(dt);
  const flash = storm.level; // lerp fog, sky, emissive windows, rain intensity…
}
```

### Ambience inside a prop

```ts
const fizz = new EffervescenceEffect({ width: 1.2, height: 1.45, spread: 0.88 });
fizz.position.set(0, 0.95, 0); // inside jar / flask volume
scene.add(fizz);
onFrame((dt) => fizz.update(dt));
```

### Star field sky dome

```ts
const stars = new StarFieldEffect({ style: "burst", radius: 480, twinkle: true });
scene.add(stars); // not parented to camera

onFrame(() => {
  stars.position.copy(camera.position);
  stars.update();
});
```

---

## Conventions (library code)

| Topic | Convention |
|-------|------------|
| **Options** | `ThingOptions` interface; JSDoc on every option with defaults; export options types from `src/index.ts` |
| **Classes** | Class-level JSDoc + `@example` for public effects and major models |
| **Animation** | `update(dt: number)` — elapsed seconds |
| **Disposal** | `dispose()` when owning geometry, materials, or textures |
| **Instancing** | `DynamicDrawUsage`, reusable `Object3D` dummy, `Float32Array` state where hot |
| **Examples** | Every feature has a corresponding file under `app/examples/`; auto-discovered by the host gallery |
| **Documentation** | Parameter docs + minimal setup snippet in JSDoc — enough to wire without reading source |
| **Randomness** | Unique per runtime today via `Math.random()`; seeded reproducibility is planned |

**Particles in Three.js:** No built-in particle engine. Use `Points` + `PointsMaterial` for lightweight sprites, or `InstancedMesh` for streaks, bubbles, and petals. Choice is rendering strategy, not the environment/FX taxonomy.

---

## Current state

What exists today and how mature each area is.

| Area | Status |
|------|--------|
| **Models & geometry** | Broad catalog; vertex-first, grouped materials |
| **Factories** | Book row, hex tiles, brick wall — ad hoc `...ByCount` / `...ByRadius` APIs |
| **Environment effects** | Star field, rain, lightning, ground fog |
| **Ambience effects** | Petal drift, effervescence, wisp, emissive pulse, glow halo, flame flicker |
| **FX (burst / triggered)** | **Not implemented** |
| **Animators** | Camera paths, light flicker, emissive pulse |
| **Host gallery** | `app/examples/` — models, effects, scenes, reference |
| **RNG** | `RandomNumberUtils` on bare `Math.random()` — **no seed in `src` today** |
| **WebGPU / TSL** | Not yet; target for shader portability |

### Modeling (today)

- Vertex-first geometry with **groups** for different materials
- Profile primitives: spline, parabolic, lathe, extrude; NURBS exploratory
- Geometry classes mirror Three.js `BufferGeometry` subclass patterns where possible

### Prefabs & instancing

- **Prefabs** — prebuilt `Mesh` objects (`Jar`, `Tree`, `Mausoleum`, …)
- **Instanced meshes** — tiles, books, particles, weather layers

### Performance (today)

- Merged geometry and instancing where factories and effects allow
- Batching audit and guidelines still informal — opportunity on roadmap

### Object options pattern

Public APIs expose `ThingOptions` interfaces (exported alongside classes). Defaults live in destructuring; JSDoc documents each field. This is the standard extension point — no positional-arg sprawl.

---

## Design patterns (target)

Two recurring design problems appear across factories and effects. The roadmap is to name them once and apply them everywhere — the difference between a library that feels **designed** and one that feels **accreted**.

### 1. Factory `fit` — constraint solving, not bespoke APIs

Many factories are the **same operation under different pinned variables**. One invariant equation hides in each:

```
extent ≈ count × itemSize + gaps
```

Three coupled variables — `extent`, `count`, `itemSize` — and a factory is just **pin two, solve for the third**:

| Use case | Pinned | Solved |
|----------|--------|--------|
| “12 books on a 1-ft shelf” | count + extent | itemSize |
| “1-inch books filling 1 ft” | itemSize + extent | count |
| Hex tiles by-count vs by-radius | (either pair) | the third |
| Fence by-path vs by-segment | (either pair) | the third |

This is **constraint solving** — the same problem CSS flexbox, table layout, and bin-packing wrestle with. It only *feels* bespoke because each factory was written from scratch. It isn't; it's one template with a chosen pin. Existing `createHexagonalTilesByCount` / `createHexagonalTilesByRadius` and `rowOfBooksByCount` / `rowOfBooksByLength` are this pattern, discovered ad hoc.

**Direction:** one factory per subject, discriminated `fit` union — replaces `...ByCount` / `...ByRadius` proliferation:

```ts
type Fit =
  | { by: "count"; count: number }                              // pin count
  | { by: "size";  size: number }                                 // pin item size
  | { by: "pack";  gap?: number }                               // greedy: as many as fit
  | { by: "pack-random"; sizeRange: [number, number]; seed?: number }; // stochastic fill

createTileFloor({ width, depth, fit: { by: "count", count: 24 } });
createBookRow({ length: 12, fit: { by: "pack-random", sizeRange: [0.8, 1.4], seed: 7 } });
```

Why this over named-per-pin functions:

- One import, one mental model, TypeScript exhaustiveness checking
- **Randomness has a natural home** — random packing is a *fill strategy*, not a pinned variable; `fit` makes deterministic and stochastic fills peers

**Goal:** share the same `fit` vocabulary across every fill-factory — books, fences, tiles, whatever's next.

**Limits:** staggered / 2D packings (hex tiles are offset-stacked) need their own placement solver. The shared `fit` vocabulary targets **most 1D fills and simple grids**, not a universal packer.

Emphasize **factories for assemblies** (racks, shelves, fences) over one-off geometry. Open design: `TestTube` vs liquid fill vs `TestTubeRack` as factory.

### 2. Seeded randomness — unique runtime, reproducible on demand

Randomness is a **major** part of this library: unique experiences each runtime (randomly-sized packed books, scatter variation, stochastic fills). But repeatability matters too — debug a scene, share a seed, get the same shelf every reload.

**Today:** `src/utils/RandomNumberUtils.ts` (`randomFloat`, `randomInteger`, `logarithmicRandomMax`, `logarithmicRandomMin`) all sit on bare `Math.random()`. This is a **from-scratch migration**, not finishing what's started.

**Direction:**

1. Small fast seedable PRNG (`mulberry32` / `splitmix32`) → `() => number` stream from a seed
2. Re-express `RandomNumberUtils` to draw from an injected RNG stream (default = unseeded, existing call sites keep working)
3. Thread optional `seed` through every stochastic factory and effect (`pack-random`, scatter, variation, …)
4. Reproducibility goal: same options + same seed ⇒ byte-identical scene graph

Default = fresh randomness each run. Pass `seed` to reproduce.

---

## Roadmap

Priorities and direction — not a commitment schedule.

### Atmosphere & content

- More **environment** layers (fog drivers, ground mist, wind fields)
- More **ambience** (leaves on terrain, localized scatter)
- **FX** module: short-lived bursts, `trigger()`, pools, fade-out
- Example `meta.category` tags (`environment` | `ambience` | `fx`) for gallery clarity
- Optional folder split: `environment/` / `ambience/` / `fx/` when FX lands

### Randomness & reproducibility

See [Seeded randomness](#2-seeded-randomness--unique-runtime-reproducible-on-demand) above. Highest-leverage migration in the random story.

### Factories

- Unified `fit` discriminant across book, tile, fence, and future fill factories
- More assembly factories (racks, shelves, composite props)
- Constraint-solving template instead of one-off `...ByX` functions

### Rendering & platform

- **WebGPU** with **TSL** shaders where possible — WebGL + WebGPU compatibility from one shader source
- Glassware material pass (`DoubleSide`, `depthWrite`, `renderOrder`) across bottles and science glass
- Batching audit: merge opportunities, instancing guidelines

### Geometry & scenes (exploratory)

- Diorama / room shells with windows (geometry exists; not yet library-ready)
- Leaded lattice windows, terrain, water
- NURBS / advanced profiles where they earn their complexity

### Documentation

- This README as single source of truth — no separate `docs/` folder
- Per-class JSDoc remains the API contract
- Examples remain living documentation

---

## Getting started

```shell
npm i three-low-poly
```

```js
import { MossyRocks } from "three-low-poly";

const rocks = new MossyRocks();
scene.add(rocks);
```

**Examples:** [jasonsturges.com/three-low-poly/](https://jasonsturges.com/three-low-poly/) — browse by category in the host gallery. Local dev: `npm run host`.

**Build:** Library publishes from `dist/`; examples live in `app/` and import `three-low-poly` like a consumer would.

![screen-capture](https://github.com/user-attachments/assets/d97345cc-bdaa-46d5-a267-531559919ee5)
_Example Graveyard scene_

---

## Author

Jason Sturges — procedural low-poly tooling for Three.js.