/**
 * @typedef {Object} ExtrudeSettings
 * @property {number} steps - Number of points used to calculate the shape between the start and end.
 * @property {number} depth - Depth to extrude the shape.
 * @property {boolean} bevelEnabled - Whether or not to apply bevel to the shape.
 * @property {number} bevelThickness - Thickness of the bevel.
 * @property {number} bevelSize - Distance from the shape outline to the bevel.
 * @property {number} bevelOffset - Offset of the bevel.
 * @property {number} bevelSegments - Number of bevel segments for the bevel curve.
 */

//------------------------------
//  Effects
//------------------------------

export { Bubbling } from "./effects/Bubbling";

//------------------------------
//  Geometries
//------------------------------

// Architecture
export { BifurcatedStaircaseGeometry } from "./geometry/architecture/BifurcatedStaircaseGeometry";
export { DioramaGeometry } from "./geometry/architecture/DioramaGeometry";
export { LShapedStaircaseGeometry } from "./geometry/architecture/LShapedStaircaseGeometry";
export { SpiralStaircaseGeometry } from "./geometry/architecture/SpiralStaircaseGeometry";
export { StaircaseGeometry } from "./geometry/architecture/StaircaseGeometry";

// Cemetery
export { CrossHeadstoneGeometry } from "./geometry/cemetery/CrossHeadstoneGeometry";
export { ObeliskHeadstoneGeometry } from "./geometry/cemetery/ObeliskHeadstoneGeometry";
export { RoundedHeadstoneGeometry } from "./geometry/cemetery/RoundedHeadstoneGeometry";
export { SquareHeadstoneGeometry } from "./geometry/cemetery/SquareHeadstoneGeometry";

// Fence
export { FenceColumn } from "./geometry/fence/FenceColumn";
export { WroughtIronBarGeometry } from "./geometry/fence/WroughtIronBarGeometry";

// Leafs
export { SimpleLeafGeometry } from "./geometry/leafs/SimpleLeafGeometry";

// Skeleton
export { BoneGeometry } from "./geometry/skeleton/BoneGeometry";

// Science
export { BeakerGeometry } from "./geometry/science/BeakerGeometry";
export { MortarGeometry } from "./geometry/science/MortarGeometry";
export { TestTubeGeometry } from "./geometry/science/TestTubeGeometry";
export { WineBottleGeometry } from "./geometry/science/WineBottleGeometry";

//------------------------------
//  Groups
//------------------------------

// Astronomy
export { Moon } from "./group/astronomy/Moon";

// Cemetery
export { Mausoleum } from "./group/cemetery/Mausoleum";

// Furniture
export { Desk } from "./group/furniture/Desk";

// Lighting
export { Candle } from "./group/lighting/Candle";
export { Lantern } from "./group/lighting/Lantern";

// Rocks
export { MossyRocks } from "./group/rocks/MossyRocks";
export { Rocks } from "./group/rocks/Rocks";

// Science
export { Beaker } from "./group/science/Beaker";
export { Book } from "./group/science/Book";
export { Bottle } from "./group/science/Bottle";
export { BunsenBurner } from "./group/science/BunsenBurner";
export { ElectricPanel } from "./group/science/ElectricPanel";
export { Flask } from "./group/science/Flask";
export { LeverPanel } from "./group/science/LeverPanel";
export { Microscope } from "./group/science/Microscope";
export { MortarAndPestle } from "./group/science/MortarAndPestle";
export { SpiralTube } from "./group/science/SpiralTube";
export { Stand } from "./group/science/Stand";
export { TeslaCoil } from "./group/science/TeslaCoil";
export { TestTube } from "./group/science/TestTube";
export { TestTubeRack } from "./group/science/TestTubeRack";
export { WineBottle } from "./group/science/WineBottle";

// Shapes
export { Star } from "./group/shapes/Star";

//------------------------------
//  Shaders
//------------------------------

export { fadeShader } from "./shaders/fadeShader";

//------------------------------
//  Shapes
//------------------------------

export { StarShape } from "./shapes/StarShape";

//------------------------------
//  Textures
//------------------------------

export { checkerboardTexture } from "./textures/checkerboard";
