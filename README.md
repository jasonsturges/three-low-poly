# Three.js Low Poly

Create or enhance stylized low-poly scenes entirely through code using procedurally generated geometries, prefabricated models, and factory utilities.

## Overview

**Three Low Poly** provides a toolkit for building low-poly environments in [Three.js](https://threejs.org) with minimal manual modeling.
It combines **procedural generation** (algorithmic geometry creation) with **parametric modeling** (user-defined parameters) to produce consistent, customizable results.

### Core Principles
- **Procedural Generation** – Create geometry algorithmically rather than by hand.
- **Parametric Modeling** – Adjust model attributes (size, color, detail, variation) via options.
- **Prefabricated Models** – Drop-in objects like trees, rocks, or books ready for scenes.
- **Factory Utilities** – Generate arrays, grids, or randomized layouts of models with a single call.

![screen-capture](https://github.com/user-attachments/assets/3285ed9a-da3c-4287-ad2f-0c7e82cd70fd)
_Example Library scene_

## Getting Started

To install, execute:

```shell
npm i three-low-poly
```

Then, import into a project and use as:

```js
import { MossyRocks } from "three-low-poly";

const rocks = new MossyRocks();
scene.add(rocks);
```

See the [examples](https://jasonsturges.com/three-low-poly/) for more information.

![screen-capture](https://github.com/user-attachments/assets/d97345cc-bdaa-46d5-a267-531559919ee5)
_Example Graveyard scene_

## Usage

Assets are procedurally generated and customizable through parameters, typically based on a core geometry that combines a mesh with a material.

Alongside these geometries, there are prefabricated models that can be added directly to the scene, as well as factory methods for bulk creation.
