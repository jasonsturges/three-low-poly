# Three.js Low Poly

Collection of procedurally generated low poly assets for Three.js.

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

See the examples folder for more information.

## Usage

Assets are procedurally generated and can be customized with parameters, generally featuring a base geometry that can be implemented as a mesh with material.

In addition to geometries are prefabricated models, either mesh or group that may be directly added to the scene with default materials.
