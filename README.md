# Three.js Low Poly

Procedurally generated low poly modeling for Three.js.

Example Graveyard Scene:

![screen-capture](https://github.com/user-attachments/assets/d97345cc-bdaa-46d5-a267-531559919ee5)

## Getting Started

To install, execute:

```shell
npm i lunarphase-js
```

Then, import into a project and use as:

```js
import { MossyRocks } from "three-low-poly";

const rocks = new MossyRocks();
scene.add(rocks);
```

See the [examples](https://jasonsturges.com/three-low-poly/) for more information.

## Usage

Assets are procedurally generated and customized via parameters, generally featuring a base geometry that implements a mesh with material.

In addition to geometries are prefabricated models, either mesh or group that may be directly added to the scene featuring default materials.
