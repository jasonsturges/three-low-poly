# Three.js Low Poly

Procedurally generated low poly modeling for Three.js.

![screen-capture](https://github.com/user-attachments/assets/3285ed9a-da3c-4287-ad2f-0c7e82cd70fd)
_Example Library scene_

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

![screen-capture](https://github.com/user-attachments/assets/d97345cc-bdaa-46d5-a267-531559919ee5)
_Example Graveyard scene_

## Usage

Assets are procedurally generated and customizable through parameters, typically based on a core geometry that combines a mesh with a material.

Alongside these geometries, there are prefabricated models that can be added directly to the scene, as well as factory methods for bulk creation.
