/**
 *     4 -------- 7
 *    /|         /|    ▀█▀ █ █ █▀▄ █▀▀ █▀▀   █   ▄▀▄ █   █   █▀▄ ▄▀▄ █   █ █
 *   5 -------- 6 |     █  █▀█ █▀▄ ██▄ ██▄   █▄▄ ▀▄▀ ▀▄▀▄▀   █▀  ▀▄▀ █▄▄ ▀▄▀
 *   | |        | |
 *   | 0 -------|-3    Procedurally generated low poly modeling for Three.js
 *   |/         |/     Author: Jason Sturges
 *   1 -------- 2
 */

//------------------------------
//  Animators
//------------------------------

export { CameraPlayback } from "./animators/CameraPlayback";
export {
  applySnapshot,
  captureSnapshot,
  type CameraClip,
  type CameraSnapshot,
  type ClipPhase,
  type ClipRuntime,
} from "./animators/cameraClip";
export {
  createDollyClip,
  createFlythroughClip,
  createOrbitClip,
  createPendulumClip,
  createSpiralClip,
  createWobbleClip,
  createZoomClip,
  type DollyClipOptions,
  type FlythroughClipOptions,
  type OrbitClipOptions,
  type PendulumClipOptions,
  type SpiralClipOptions,
  type WobbleClipOptions,
  type ZoomClipOptions,
} from "./animators/cameraClips";

//------------------------------
//  Brushes
//------------------------------

export { displacementBrush } from "./brushes/DisplacementBrush";
export { flattenBrush } from "./brushes/FlattenBrush";
export { noiseBrush } from "./brushes/NoiseBrush";
export { smoothBrush } from "./brushes/SmoothBrush";
export { spikeBrush } from "./brushes/SpikeBrush";
export { twistBrush } from "./brushes/TwistBrush";

//------------------------------
//  Constants
//------------------------------

export { Axis } from "./constants/Axis";
export { BoxSide } from "./constants/BoxSide";
export { ColorPalette } from "./constants/ColorPalette";
export { Direction } from "./constants/Direction";
export { Easing, type EasingFunction } from "./constants/Easing";
export { Falloff, type FalloffFunction } from "./constants/Falloff";
export { ParametricCurve } from "./constants/ParametricCurve";

//------------------------------
//  Effects
//------------------------------

export { EffervescenceEffect, type EffervescenceEffectOptions } from "./effects/EffervescenceEffect";
export { FlameFlickerEffect, type FlameFlickerEffectOptions } from "./effects/FlameFlickerEffect";
export { GroundFogEffect, type GroundFogEffectOptions } from "./effects/GroundFogEffect";
export { GlowHalo, type GlowHaloOptions } from "./effects/GlowHalo";
export {
  EmissivePulseEffect,
  type EmissivePulseEffectOptions,
  type EmissivePulseMaterial,
} from "./effects/EmissivePulseEffect";
export { LightningEffect, type LightningEffectOptions } from "./effects/LightningEffect";
export { PetalDriftEffect, type PetalDriftEffectOptions } from "./effects/PetalDriftEffect";
export { RainEffect, type RainEffectOptions } from "./effects/RainEffect";
export { WispEffect, type WispEffectOptions } from "./effects/WispEffect";
export {
  StarFieldEffect,
  type StarBurstShapeOptions,
  type StarFieldEffectOptions,
} from "./effects/StarFieldEffect";

//------------------------------
//  Factory
//------------------------------

export * from "./factory/BookFactory";
export * from "./factory/HexagonalTileFactory";

//------------------------------
//  Geometries
//------------------------------

// Architecture
export { DiamondLatticeWindowGeometry } from "./geometry/architecture/DiamondLatticeWindowGeometry";
export { GregorianLatticeWindowGeometry } from "./geometry/architecture/GregorianLatticeWindowGeometry";
export {
  buildGregorianLatticeParts,
  gregorianLatticeGridFromCells,
  type GregorianLatticeGrid,
} from "./geometry/architecture/gregorianLattice";
export {
  buildRingLatticeFrameParts,
  createOpeningClippingPlanes,
  createRingLatticeGeometry,
  resolveRingLatticeCell,
  ringLatticeSpots,
  RING_LATTICE_SPACING_FACTOR,
  type RingLatticeGrid,
} from "./geometry/architecture/ringLattice";
export {
  buildDiamondLatticeParts,
  clipSegmentToAabb,
  diamondLatticeCellFromCount,
  diamondLatticeCornerSpan,
  diamondLatticeGridFromCells,
  diamondLatticeSpacingFromGrid,
  fitDiamondLatticeCell,
  type DiamondLatticeGrid,
} from "./geometry/architecture/diamondLattice";
export {
  LShapedStaircaseGeometry,
  type LShapedStaircaseGeometryOptions,
} from "./geometry/architecture/LShapedStaircaseGeometry";
export {
  SpiralStaircaseGeometry,
  type SpiralStaircaseGeometryOptions,
} from "./geometry/architecture/SpiralStaircaseGeometry";
export {
  StaircaseGeometry,
  type StaircaseGeometryOptions,
} from "./geometry/architecture/StaircaseGeometry";

// Books
export { BookGeometry } from "./geometry/books/BookGeometry";

// Bottles
export { JarGeometry } from "./geometry/bottles/JarGeometry";
export { PotionBottleGeometry } from "./geometry/bottles/PotionBottleGeometry";
export { WineBottleGeometry } from "./geometry/bottles/WineBottleGeometry";

// Cemetery
export { CrossHeadstoneGeometry } from "./geometry/cemetery/CrossHeadstoneGeometry";
export { MausoleumGeometry } from "./geometry/cemetery/MausoleumGeometry";
export { ObeliskHeadstoneGeometry } from "./geometry/cemetery/ObeliskHeadstoneGeometry";
export { RoundedHeadstoneGeometry } from "./geometry/cemetery/RoundedHeadstoneGeometry";
export { SquareHeadstoneGeometry } from "./geometry/cemetery/SquareHeadstoneGeometry";

// Fence
export { StoneFencePostGeometry } from "./geometry/fence/StoneFencePostGeometry";
export { WroughtIronBarGeometry } from "./geometry/fence/WroughtIronBarGeometry";
export { WroughtIronFenceGeometry } from "./geometry/fence/WroughtIronFenceGeometry";

// Furniture
export { BookshelfGeometry } from "./geometry/furniture/BookshelfGeometry";
export { DeskGeometry } from "./geometry/furniture/DeskGeometry";

// Leafs
export { EllipticLeafGeometry } from "./geometry/leafs/EllipticLeafGeometry";

// Lighting
export { FlameGeometry } from "./geometry/lighting/FlameGeometry";
export { CandleGeometry } from "./geometry/lighting/CandleGeometry";

// Primitives
export { ParallelogramBoxGeometry } from "./geometry/primitives/ParallelogramBoxGeometry";

// Rocks
export { MossyRocksGeometry } from "./geometry/rocks/MossyRocksGeometry";
export { RockGeometry } from "./geometry/rocks/RockGeometry";
export { RocksGeometry } from "./geometry/rocks/RocksGeometry";

// Shapes
export { BurstGeometry } from "./geometry/shapes/BurstGeometry";
export { GearGeometry } from "./geometry/shapes/GearGeometry";
export { HeartGeometry } from "./geometry/shapes/HeartGeometry";
export { HexagonGeometry } from "./geometry/shapes/HexagonGeometry";
export { StarGeometry } from "./geometry/shapes/StarGeometry";

// Skeleton
export { BoneGeometry } from "./geometry/skeleton/BoneGeometry";

// Science
export { ErlenmeyerFlaskGeometry } from "./geometry/science/ErlenmeyerFlaskGeometry";
export { FlorenceFlaskGeometry } from "./geometry/science/FlorenceFlaskGeometry";
export { MortarGeometry } from "./geometry/science/MortarGeometry";
export { StandGeometry } from "./geometry/science/StandGeometry";
export { TeslaCoilGeometry } from "./geometry/science/TeslaCoilGeometry";
export { TestTubeGeometry } from "./geometry/science/TestTubeGeometry";

// Terrain
export { HillGeometry } from "./geometry/terrain/HillGeometry";
export { MoundGeometry } from "./geometry/terrain/MoundGeometry";

// Trees
export { TreeGeometry } from "./geometry/trees/TreeGeometry";

//------------------------------
//  Materials
//------------------------------

//------------------------------
//  Models
//------------------------------

// Architecture
export { LShapedStaircase, type LShapedStaircaseOptions } from "./models/architecture/LShapedStaircase";
export { SpiralStaircase, type SpiralStaircaseOptions } from "./models/architecture/SpiralStaircase";
export { Staircase, type StaircaseOptions } from "./models/architecture/Staircase";
export { DiamondLatticeWindow } from "./models/architecture/DiamondLatticeWindow";
export { GregorianLatticeWindow } from "./models/architecture/GregorianLatticeWindow";
export { RingLatticeWindow } from "./models/architecture/RingLatticeWindow";

// Astronomy
export { Moon } from "./models/astronomy/Moon";

// Books
export { Book } from "./models/books/Book";

// Bottles
export { Jar } from "./models/bottles/Jar";
export { PotionBottle } from "./models/bottles/PotionBottle";
export { WineBottle } from "./models/bottles/WineBottle";

// Cemetery
export { CrossHeadstone } from "./models/cemetery/CrossHeadstone";
export { Mausoleum } from "./models/cemetery/Mausoleum";
export { ObeliskHeadstone } from "./models/cemetery/ObeliskHeadstone";
export { RoundedHeadstone } from "./models/cemetery/RoundedHeadstone";
export { SquareHeadstone } from "./models/cemetery/SquareHeadstone";

// Fence
export { StoneFencePost } from "./models/fence/StoneFencePost";
export { WroughtIronBar } from "./models/fence/WroughtIronBar";
export { WroughtIronFence } from "./models/fence/WroughtIronFence";

// Furniture
export { Bookshelf } from "./models/furniture/Bookshelf";
export { Desk } from "./models/furniture/Desk";

// Lighting
export { Candle } from "./models/lighting/Candle";
export { Flame } from "./models/lighting/Flame";
export { Lantern } from "./models/lighting/Lantern";

// Rocks
export { MossyRocks } from "./models/rocks/MossyRocks";
export { Rock } from "./models/rocks/Rock";
export { Rocks } from "./models/rocks/Rocks";

// Science
export { BunsenBurner } from "./models/science/BunsenBurner";
export { ElectricPanel } from "./models/science/ElectricPanel";
export { ErlenmeyerFlask } from "./models/science/ErlenmeyerFlask";
export { FlorenceFlask } from "./models/science/FlorenceFlask";
export { LeverPanel } from "./models/science/LeverPanel";
export { Microscope } from "./models/science/Microscope";
export { MortarAndPestle } from "./models/science/MortarAndPestle";
export { Panel, type PanelOptions } from "./models/science/Panel";
export { PanelLight, type PanelLightOptions } from "./models/science/PanelLight";
export { SpiralTube } from "./models/science/SpiralTube";
export { Stand } from "./models/science/Stand";
export { TeslaCoil } from "./models/science/TeslaCoil";
export { TestTube } from "./models/science/TestTube";
export { TestTubeRack, type TestTubeRackOptions } from "./models/science/TestTubeRack";

// Shapes
export { Burst } from "./models/shapes/Burst";
export { Gear } from "./models/shapes/Gear";
export { Heart } from "./models/shapes/Heart";
export { Hexagon } from "./models/shapes/Hexagon";
export { Star } from "./models/shapes/Star";

// Skeleton
export { Bone } from "./models/skeleton/Bone";

// Trees
export { Tree } from "./models/trees/Tree";

// Terrain
export { Hill } from "./models/terrain/Hill";
export { Mound } from "./models/terrain/Mound";

//------------------------------
//  Shaders
//------------------------------

export { addInstanceColor } from "./shaders/addInstanceColor";
export { addWaterDisplacement, updateWaterDisplacementTime } from "./shaders/addWaterDisplacement";
export { addNoiseDisplacement, updateNoiseDisplacementTime } from "./shaders/addNoiseDisplacement";
export { atmosphericShader, type AtmosphericShaderUniforms } from "./shaders/atmosphericShader";
export { blurTransitionShader } from "./shaders/blurTransitionShader";
export { crossfadeShader } from "./shaders/crossfadeShader";
export { daySkyShader, type DaySkyUniforms } from "./shaders/daySkyShader";
export { fadeShader } from "./shaders/fadeShader";
export { fadeTransitionSceneShader } from "./shaders/fadeTransitionSceneShader";
export { moonShader } from "./shaders/moonShader";
export { nightSkyShader, type NightSkyUniforms } from "./shaders/nightSkyShader";

//------------------------------
//  Shapes
//------------------------------

export { BurstShape } from "./shapes/BurstShape";
export { GearShape } from "./shapes/GearShape";
export { HeartShape } from "./shapes/HeartShape";
export { HexagonShape } from "./shapes/HexagonShape";
export { StarShape } from "./shapes/StarShape";

//------------------------------
//  Skybox
//------------------------------

export { AtmosphericSkybox } from "./skybox/AtmosphericSkybox";
export { DaySkybox } from "./skybox/DaySkybox";
export { NightSkybox } from "./skybox/NightSkybox";

//------------------------------
//  Textures
//------------------------------

export { checkerboardTexture } from "./textures/checkerboard";

//------------------------------
//  Transitions
//------------------------------

export { CameraTransition, type CameraTransitionOptions } from "./transitions/CameraTransition";
export { SceneTransition, type SceneTransitionOptions } from "./transitions/SceneTransition";
export { SceneTransitionFX, type SceneTransitionFXOptions } from "./transitions/SceneTransitionFX";

//------------------------------
//  Utils
//------------------------------

export * from "./utils/AlignToEdge";
export * from "./utils/AlignToRow";
export * from "./utils/AlignToSurface";
export * from "./utils/Center";
export * from "./utils/ColorUtils";
export * from "./utils/FindClosestPoint";
export * from "./utils/InterpolateCurve";
export * from "./utils/LineEquations";
export * from "./utils/ParametricCurveUtils";
export * from "./utils/QuadUtils";
export {
  Random,
  createRandom,
  deriveSubSeed,
  mulberry32,
  randomPick,
  randomRange,
  splitmix32,
  type RandomSource,
  type RandomStream,
} from "./utils/Random";
export * from "./utils/RandomNumberUtils";
export * from "./utils/RandomTimer";
export * from "./utils/SphericalCurve";
export * from "./utils/SphericalGeometryUtils";
export * from "./utils/UVUtils";
export * from "./utils/VertexUtils";
