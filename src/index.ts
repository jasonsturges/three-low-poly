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
export * from "./factory/RockFactory";

//------------------------------
//  Geometries
//------------------------------

// Architecture
export { ArchedDiamondLatticeWindowGeometry } from "./geometry/architecture/ArchedDiamondLatticeWindowGeometry";
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
  archedOpeningMetrics,
  buildArchedDiamondLatticeCameParts,
  buildArchedDiamondLatticeFrameGeometry,
  buildArchedDiamondLatticeParts,
  buildDiamondLatticeCameParts,
  diamondLatticeSpringPhaseShift,
  insetArchedOpeningMetrics,
  traceArchedOpeningOutline,
  buildDiamondLatticeParts,
  clipSegmentToAabb,
  clipSegmentToArchedOpening,
  diamondLatticeCellFromCount,
  diamondLatticeCornerSpan,
  diamondLatticeGridFromCells,
  fitDiamondLatticeCell,
  type ArchedOpeningBounds,
  type ArchedOpeningMetrics,
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
export { BookGeometry, type BookGeometryOptions } from "./geometry/books/BookGeometry";

// Bottles
export { JarGeometry } from "./geometry/bottles/JarGeometry";
export { PotionBottleGeometry } from "./geometry/bottles/PotionBottleGeometry";
export { WineBottleGeometry, type WineBottleGeometryOptions } from "./geometry/bottles/WineBottleGeometry";

// Cemetery
export {
  CrossHeadstoneGeometry,
  type CrossHeadstoneGeometryOptions,
} from "./geometry/cemetery/CrossHeadstoneGeometry";
export { MausoleumGeometry } from "./geometry/cemetery/MausoleumGeometry";
export {
  ObeliskHeadstoneGeometry,
  type ObeliskHeadstoneGeometryOptions,
} from "./geometry/cemetery/ObeliskHeadstoneGeometry";
export { RoundedHeadstoneGeometry } from "./geometry/cemetery/RoundedHeadstoneGeometry";
export { SquareHeadstoneGeometry } from "./geometry/cemetery/SquareHeadstoneGeometry";

// Fence
export {
  StoneFencePostGeometry,
  type StoneFencePostGeometryOptions,
} from "./geometry/fence/StoneFencePostGeometry";
export {
  WroughtIronBarGeometry,
  type WroughtIronBarGeometryOptions,
} from "./geometry/fence/WroughtIronBarGeometry";
export {
  WroughtIronFenceGeometry,
  type WroughtIronFenceGeometryOptions,
} from "./geometry/fence/WroughtIronFenceGeometry";

// Furniture
export { BookshelfGeometry, type BookshelfGeometryOptions } from "./geometry/furniture/BookshelfGeometry";
export { DeskGeometry } from "./geometry/furniture/DeskGeometry";

// Leafs
export { EllipticLeafGeometry } from "./geometry/leafs/EllipticLeafGeometry";
export { LeafGeometry, type LeafGeometryOptions } from "./geometry/leafs/LeafGeometry";

// Lighting
export { FlameGeometry, type FlameGeometryOptions } from "./geometry/lighting/FlameGeometry";
export { CandleGeometry, type CandleGeometryOptions } from "./geometry/lighting/CandleGeometry";
export { LanternGeometry, type LanternGeometryOptions } from "./geometry/lighting/LanternGeometry";
export {
  HangingLanternGeometry,
  type HangingLanternGeometryOptions,
} from "./geometry/lighting/HangingLanternGeometry";
export {
  WallSconceGeometry,
  type WallSconceGeometryOptions,
} from "./geometry/lighting/WallSconceGeometry";

// Primitives
export { ParallelogramBoxGeometry } from "./geometry/primitives/ParallelogramBoxGeometry";

// Rocks
export { MossyRockGeometry, type MossyRockGeometryOptions } from "./geometry/rocks/MossyRockGeometry";
export { RockGeometry, type RockGeometryOptions } from "./geometry/rocks/RockGeometry";

// Shapes
export { BurstGeometry, type BurstGeometryOptions } from "./geometry/shapes/BurstGeometry";
export { GearGeometry, type GearGeometryOptions } from "./geometry/shapes/GearGeometry";
export { HeartGeometry, type HeartGeometryOptions } from "./geometry/shapes/HeartGeometry";
export { HexagonGeometry, type HexagonGeometryOptions } from "./geometry/shapes/HexagonGeometry";
export { StarGeometry, type StarGeometryOptions } from "./geometry/shapes/StarGeometry";

// Skeleton
export { BoneGeometry } from "./geometry/skeleton/BoneGeometry";

// Science
export {
  ErlenmeyerFlaskGeometry,
  type ErlenmeyerFlaskGeometryOptions,
} from "./geometry/science/ErlenmeyerFlaskGeometry";
export { FlorenceFlaskGeometry } from "./geometry/science/FlorenceFlaskGeometry";
export { MortarGeometry } from "./geometry/science/MortarGeometry";
export { StandGeometry, type StandGeometryOptions } from "./geometry/science/StandGeometry";
export { TeslaCoilGeometry } from "./geometry/science/TeslaCoilGeometry";
export { TestTubeGeometry } from "./geometry/science/TestTubeGeometry";

// Terrain
export { HillGeometry, type HillGeometryOptions } from "./geometry/terrain/HillGeometry";
export { MoundGeometry, type MoundGeometryOptions } from "./geometry/terrain/MoundGeometry";

// Trees
export { TreeGeometry, type TreeGeometryOptions } from "./geometry/trees/TreeGeometry";

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
export { ArchedDiamondLatticeWindow } from "./models/architecture/ArchedDiamondLatticeWindow";
export { DiamondLatticeWindow } from "./models/architecture/DiamondLatticeWindow";
export { GregorianLatticeWindow } from "./models/architecture/GregorianLatticeWindow";
export { RingLatticeWindow } from "./models/architecture/RingLatticeWindow";

// Books
export { Book, type BookOptions } from "./models/books/Book";

// Bottles
export { Jar } from "./models/bottles/Jar";
export { PotionBottle } from "./models/bottles/PotionBottle";
export { WineBottle, type WineBottleOptions } from "./models/bottles/WineBottle";

// Cemetery
export { CrossHeadstone, type CrossHeadstoneOptions } from "./models/cemetery/CrossHeadstone";
export { Mausoleum } from "./models/cemetery/Mausoleum";
export { ObeliskHeadstone, type ObeliskHeadstoneOptions } from "./models/cemetery/ObeliskHeadstone";
export { RoundedHeadstone } from "./models/cemetery/RoundedHeadstone";
export { SquareHeadstone } from "./models/cemetery/SquareHeadstone";

// Fence
export { StoneFencePost, type StoneFencePostOptions } from "./models/fence/StoneFencePost";
export { WroughtIronBar, type WroughtIronBarOptions } from "./models/fence/WroughtIronBar";
export { WroughtIronFence, type WroughtIronFenceOptions } from "./models/fence/WroughtIronFence";

// Furniture
export { Bookshelf, type BookshelfOptions } from "./models/furniture/Bookshelf";
export { Desk } from "./models/furniture/Desk";

// Leafs
export { Leaf, type LeafOptions } from "./models/leafs/Leaf";

// Lighting
export { Candle, type CandleOptions } from "./models/lighting/Candle";
export { Flame, type FlameOptions } from "./models/lighting/Flame";
export { HangingLantern, type HangingLanternOptions } from "./models/lighting/HangingLantern";
export { WallSconce, type WallSconceOptions } from "./models/lighting/WallSconce";
export { Lantern, type LanternOptions } from "./models/lighting/Lantern";

// Rocks
export { MossyRock, type MossyRockOptions } from "./models/rocks/MossyRock";
export { Rock, type RockOptions } from "./models/rocks/Rock";

// Science
export { BunsenBurner } from "./models/science/BunsenBurner";
export { ElectricPanel } from "./models/science/ElectricPanel";
export { ErlenmeyerFlask, type ErlenmeyerFlaskOptions } from "./models/science/ErlenmeyerFlask";
export { FlorenceFlask } from "./models/science/FlorenceFlask";
export { LeverPanel } from "./models/science/LeverPanel";
export { Microscope } from "./models/science/Microscope";
export { MortarAndPestle } from "./models/science/MortarAndPestle";
export { Panel, type PanelOptions } from "./models/science/Panel";
export { PanelLight, type PanelLightOptions } from "./models/science/PanelLight";
export { SpiralTube } from "./models/science/SpiralTube";
export { Stand, type StandOptions } from "./models/science/Stand";
export { TeslaCoil } from "./models/science/TeslaCoil";
export { TestTube } from "./models/science/TestTube";
export { TestTubeRack, type TestTubeRackOptions } from "./models/science/TestTubeRack";

// Shapes
export { Burst, type BurstOptions } from "./models/shapes/Burst";
export { Gear, type GearOptions } from "./models/shapes/Gear";
export { Heart, type HeartOptions } from "./models/shapes/Heart";
export { Hexagon, type HexagonOptions } from "./models/shapes/Hexagon";
export { Star, type StarOptions } from "./models/shapes/Star";

// Skeleton
export { Bone } from "./models/skeleton/Bone";

// Trees
export { Tree, type TreeOptions } from "./models/trees/Tree";

// Terrain
export { Hill, type HillOptions } from "./models/terrain/Hill";
export { Mound, type MoundOptions } from "./models/terrain/Mound";

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
