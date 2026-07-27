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

export { DustMotesEffect, type DustMotesEffectOptions } from "./effects/DustMotesEffect";
export { EffervescenceEffect, type EffervescenceEffectOptions } from "./effects/EffervescenceEffect";
export {
  EmissivePulseEffect,
  type EmissivePulseEffectOptions,
  type EmissivePulseMaterial,
} from "./effects/EmissivePulseEffect";
export {
  flameFlicker,
  FlameFlickerEffect,
  type FlameFlickerEffectOptions,
} from "./effects/FlameFlickerEffect";
export { glowFalloffTexture, GlowHalo, type GlowHaloOptions } from "./effects/GlowHalo";
export { GroundFogEffect, type GroundFogEffectOptions } from "./effects/GroundFogEffect";
export { LightningEffect, type LightningEffectOptions } from "./effects/LightningEffect";
export { PetalDriftEffect, type PetalDriftEffectOptions } from "./effects/PetalDriftEffect";
export { RainEffect, type RainEffectOptions } from "./effects/RainEffect";
export { WispEffect, type WispEffectOptions } from "./effects/WispEffect";

//------------------------------
//  Factory
//------------------------------

export * from "./factory/BookFactory";
export * from "./factory/BoulderFactory";
export * from "./factory/DoorFactory";
export * from "./factory/FenceFactory";
export * from "./factory/HeadstoneFactory";
export * from "./factory/HexagonalTileFactory";
export * from "./factory/AppleTree";
export * from "./factory/AutumnTree";
export * from "./factory/PumpkinPatch";
export * from "./factory/RusticFence";
export * from "./factory/VotiveRack";
export * from "./factory/RockFactory";
export * from "./factory/StaircaseFactory";
export * from "./factory/WindowFactory";

//------------------------------
//  Geometries
//------------------------------

// Architecture
export { ArchGeometry, type ArchGeometryOptions } from "./geometry/architecture/ArchGeometry";
export {
  WindowFrameGeometry,
  type WindowFrameGeometryOptions,
} from "./geometry/architecture/WindowFrameGeometry";
export { ArchedDiamondLatticeWindowGeometry } from "./geometry/architecture/ArchedDiamondLatticeWindowGeometry";
export { DiamondLatticeWindowGeometry } from "./geometry/architecture/DiamondLatticeWindowGeometry";
export { GregorianLatticeWindowGeometry } from "./geometry/architecture/GregorianLatticeWindowGeometry";
export {
  buildGregorianLatticeParts,
  gregorianLatticeGridFromCells,
  type GregorianLatticeGrid,
} from "./geometry/architecture/gregorianLattice";
export {
  archedOpeningMetrics,
  buildArchedDiamondLatticeCameParts,
  buildArchedDiamondLatticeFrameGeometry,
  buildArchedDiamondLatticeParts,
  buildDiamondLatticeCameParts,
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
  SpiralStaircaseGeometry,
  type SpiralStaircaseGeometryOptions,
} from "./geometry/architecture/SpiralStaircaseGeometry";
export {
  StaircaseGeometry,
  type StaircaseGeometryOptions,
} from "./geometry/architecture/StaircaseGeometry";

// Atmosphere
export {
  SmokeCurlGeometry,
  type SmokeCurlGeometryOptions,
} from "./geometry/atmosphere/SmokeCurlGeometry";

// Books
export { BookGeometry, type BookGeometryOptions } from "./geometry/books/BookGeometry";

// Cemetery
export {
  CelticCrossHeadstoneGeometry,
  type CelticCrossHeadstoneGeometryOptions,
} from "./geometry/cemetery/CelticCrossHeadstoneGeometry";
export {
  CrossHeadstoneGeometry,
  type CrossHeadstoneGeometryOptions,
} from "./geometry/cemetery/CrossHeadstoneGeometry";
export { MausoleumGeometry } from "./geometry/cemetery/MausoleumGeometry";
export { ObeliskGeometry, type ObeliskGeometryOptions } from "./geometry/cemetery/ObeliskGeometry";
export {
  ObeliskHeadstoneGeometry,
  type ObeliskHeadstoneGeometryOptions,
} from "./geometry/cemetery/ObeliskHeadstoneGeometry";
export {
  RoundedHeadstoneGeometry,
  type RoundedHeadstoneGeometryOptions,
} from "./geometry/cemetery/RoundedHeadstoneGeometry";
export { SquareHeadstoneGeometry } from "./geometry/cemetery/SquareHeadstoneGeometry";

// Fence
export {
  StoneFencePostGeometry,
  type StoneFencePostGeometryOptions,
} from "./geometry/fence/StoneFencePostGeometry";
export {
  WoodPicketGeometry,
  type WoodPicketGeometryOptions,
} from "./geometry/fence/WoodPicketGeometry";
export { WoodPostGeometry, type WoodPostGeometryOptions } from "./geometry/fence/WoodPostGeometry";
export {
  WroughtIronPicketGeometry,
  type WroughtIronPicketGeometryOptions,
} from "./geometry/fence/WroughtIronPicketGeometry";
export {
  WroughtIronPostGeometry,
  type WroughtIronPostGeometryOptions,
} from "./geometry/fence/WroughtIronPostGeometry";
export {
  WroughtIronScrollGeometry,
  type WroughtIronScrollGeometryOptions,
} from "./geometry/fence/WroughtIronScrollGeometry";

// Flora
export {
  createPumpkinGeometry,
  createPumpkinRindGeometry,
  createPumpkinStemGeometry,
  pumpkinStemMatrix,
  PumpkinGeometry,
  type PumpkinAssemblyOptions,
  type PumpkinGeometryOptions,
  type PumpkinRindGeometryOptions,
  type PumpkinStemGeometryOptions,
} from "./geometry/flora/PumpkinGeometry";

// Furniture
export { BookshelfGeometry, type BookshelfGeometryOptions } from "./geometry/furniture/BookshelfGeometry";
export { DeskGeometry } from "./geometry/furniture/DeskGeometry";

// Leafs
export { EllipticLeafGeometry } from "./geometry/leafs/EllipticLeafGeometry";
export { LeafGeometry, type LeafGeometryOptions } from "./geometry/leafs/LeafGeometry";

// Lighting
export {
  CoachLanternGeometry,
  type CoachLanternGeometryOptions,
} from "./geometry/lighting/CoachLanternGeometry";
export { FlameGeometry, type FlameGeometryOptions } from "./geometry/lighting/FlameGeometry";
export { CandleGeometry, type CandleGeometryOptions } from "./geometry/lighting/CandleGeometry";
export {
  HangingLanternGeometry,
  type HangingLanternGeometryOptions,
} from "./geometry/lighting/HangingLanternGeometry";
export {
  WallSconceGeometry,
  type WallSconceGeometryOptions,
} from "./geometry/lighting/WallSconceGeometry";

// Primitives

// Rocks
export { BoulderGeometry, type BoulderGeometryOptions } from "./geometry/rocks/BoulderGeometry";
export { MossyRockGeometry, type MossyRockGeometryOptions } from "./geometry/rocks/MossyRockGeometry";
export { RockGeometry, type RockGeometryOptions } from "./geometry/rocks/RockGeometry";

// Shapes
export {
  ArchedSlabGeometry,
  type ArchedSlabGeometryOptions,
} from "./geometry/shapes/ArchedSlabGeometry";
export { BurstGeometry, type BurstGeometryOptions } from "./geometry/shapes/BurstGeometry";
export { ClubGeometry, type ClubGeometryOptions } from "./geometry/shapes/ClubGeometry";
export { DiamondGeometry, type DiamondGeometryOptions } from "./geometry/shapes/DiamondGeometry";
export {
  AnnulusGeometry,
  type AnnulusGeometryOptions,
} from "./geometry/shapes/AnnulusGeometry";
export { GearGeometry, type GearGeometryOptions } from "./geometry/shapes/GearGeometry";
export {
  CrossedWheelGeometry,
  type CrossedWheelGeometryOptions,
} from "./geometry/shapes/CrossedWheelGeometry";
export {
  BevelGearGeometry,
  type BevelGearGeometryOptions,
} from "./geometry/shapes/BevelGearGeometry";
export {
  InternalGearGeometry,
  type InternalGearGeometryOptions,
} from "./geometry/shapes/InternalGearGeometry";
export { RackGeometry, type RackGeometryOptions } from "./geometry/shapes/RackGeometry";
export { HeartGeometry, type HeartGeometryOptions } from "./geometry/shapes/HeartGeometry";
export { PolygonGeometry, type PolygonGeometryOptions } from "./geometry/shapes/PolygonGeometry";
export { SpadeGeometry, type SpadeGeometryOptions } from "./geometry/shapes/SpadeGeometry";
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
export { TerrainMoundGeometry, type TerrainMoundGeometryOptions } from "./geometry/terrain/TerrainMoundGeometry";
export { TerrainPlaneGeometry, type TerrainPlaneGeometryOptions } from "./geometry/terrain/TerrainPlaneGeometry";

// Timber
export {
  WeatheredPlankGeometry,
  type WeatheredPlankGeometryOptions,
} from "./geometry/timber/WeatheredPlankGeometry";

// Trees
export {
  GnarledTreeGeometry,
  type GnarledTreeGeometryOptions,
} from "./geometry/trees/GnarledTreeGeometry";
export {
  ClearingTreeGeometry,
  type ClearingTreeGeometryOptions,
} from "./geometry/trees/ClearingTreeGeometry";

// Vessels
export { JarGeometry } from "./geometry/vessels/JarGeometry";
export { PotionBottleGeometry } from "./geometry/vessels/PotionBottleGeometry";
export { VaseGeometry, type VaseGeometryOptions } from "./geometry/vessels/VaseGeometry";
export { WineBottleGeometry, type WineBottleGeometryOptions } from "./geometry/vessels/WineBottleGeometry";

//------------------------------
//  Helpers
//------------------------------

export { GroundGrid, type GroundGridOptions } from "./helpers/GroundGrid";

//------------------------------
//  Materials
//------------------------------

//------------------------------
//  Models
//------------------------------

// Architecture
export { Arch, type ArchOptions } from "./models/architecture/Arch";
export { SpiralStaircase, type SpiralStaircaseOptions } from "./models/architecture/SpiralStaircase";
export { Staircase, type StaircaseOptions } from "./models/architecture/Staircase";
export { ArchedDiamondLatticeWindow } from "./models/architecture/ArchedDiamondLatticeWindow";
export { DiamondLatticeWindow } from "./models/architecture/DiamondLatticeWindow";
export { GregorianLatticeWindow } from "./models/architecture/GregorianLatticeWindow";

// Atmosphere
export { SmokeCurl, type SmokeCurlOptions } from "./models/atmosphere/SmokeCurl";

// Books
export { Book, type BookOptions } from "./models/books/Book";

// Cemetery
export { CelticCrossHeadstone, type CelticCrossHeadstoneOptions } from "./models/cemetery/CelticCrossHeadstone";
export { CrossHeadstone, type CrossHeadstoneOptions } from "./models/cemetery/CrossHeadstone";
export { Mausoleum } from "./models/cemetery/Mausoleum";
export { Obelisk, type ObeliskOptions } from "./models/cemetery/Obelisk";
export { ObeliskHeadstone, type ObeliskHeadstoneOptions } from "./models/cemetery/ObeliskHeadstone";
export { RoundedHeadstone } from "./models/cemetery/RoundedHeadstone";
export { SquareHeadstone } from "./models/cemetery/SquareHeadstone";

// Fence
export { StoneFencePost, type StoneFencePostOptions } from "./models/fence/StoneFencePost";
export { WoodPicket, type WoodPicketOptions } from "./models/fence/WoodPicket";
export { WoodPost, type WoodPostOptions } from "./models/fence/WoodPost";
export { WroughtIronPicket, type WroughtIronPicketOptions } from "./models/fence/WroughtIronPicket";
export { WroughtIronPost, type WroughtIronPostOptions } from "./models/fence/WroughtIronPost";
export { WroughtIronScroll, type WroughtIronScrollOptions } from "./models/fence/WroughtIronScroll";

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

// Rocks
export { Boulder, type BoulderOptions } from "./models/rocks/Boulder";
export { MossyRock, type MossyRockOptions } from "./models/rocks/MossyRock";
export { Rock, type RockOptions } from "./models/rocks/Rock";

// Science
export { BunsenBurner } from "./models/science/BunsenBurner";
export { ErlenmeyerFlask, type ErlenmeyerFlaskOptions } from "./models/science/ErlenmeyerFlask";
export { FlorenceFlask } from "./models/science/FlorenceFlask";
export { Microscope } from "./models/science/Microscope";
export { MortarAndPestle } from "./models/science/MortarAndPestle";
export { SpiralTube } from "./models/science/SpiralTube";
export { Stand, type StandOptions } from "./models/science/Stand";
export { TeslaCoil } from "./models/science/TeslaCoil";
export { TestTube } from "./models/science/TestTube";

// Shapes

// Skeleton
export { Bone } from "./models/skeleton/Bone";

// Trees

// Terrain
export { TerrainMound, type TerrainMoundOptions } from "./models/terrain/TerrainMound";
export { TerrainPlane, type TerrainPlaneOptions } from "./models/terrain/TerrainPlane";

// Vessels
export { Jar } from "./models/vessels/Jar";
export { PotionBottle } from "./models/vessels/PotionBottle";
export { Vase, type VaseOptions } from "./models/vessels/Vase";
export { WineBottle, type WineBottleOptions } from "./models/vessels/WineBottle";

//------------------------------
//  Paths
//------------------------------

export { arcPath, type ArcPathOptions } from "./paths/ArcPath";
export { curvePath } from "./paths/CurvePath";
export { helixPath, type HelixPathOptions } from "./paths/HelixPath";
export { linePath } from "./paths/LinePath";
export { type PathPoint } from "./paths/PathPoint";
export { joinPaths, reversePath, transformPath } from "./paths/PathUtils";
export { spiralPath, type SpiralPathOptions } from "./paths/SpiralPath";

//------------------------------
//  Shapes
//------------------------------

export { ArchedSlabShape, type ArchedSlabHalf, type ArchedSlabShapeOptions } from "./shapes/ArchedSlabShape";
export { BurstShape, type BurstShapeOptions } from "./shapes/BurstShape";
export { ClubShape, type ClubShapeOptions } from "./shapes/ClubShape";
export { DiamondShape, type DiamondShapeOptions } from "./shapes/DiamondShape";
export { GearShape, type GearShapeOptions } from "./shapes/GearShape";
export { CrossedWheelShape, type CrossedWheelShapeOptions } from "./shapes/CrossedWheelShape";
export { InternalGearShape, type InternalGearShapeOptions } from "./shapes/InternalGearShape";
export { RackShape, type RackShapeOptions } from "./shapes/RackShape";
export { HeartShape, type HeartShapeOptions } from "./shapes/HeartShape";
export { PolygonShape, type PolygonShapeOptions } from "./shapes/PolygonShape";
export { SpadeShape, type SpadeShapeOptions } from "./shapes/SpadeShape";
export { StarShape, type StarShapeOptions } from "./shapes/StarShape";
export { StrapHingeShape, type StrapHingeShapeOptions } from "./shapes/StrapHingeShape";
export {
  WallShape,
  openingOutline,
  wallOpeningTop,
  type WallOpeningOptions,
  type WallShapeOptions,
} from "./shapes/WallShape";
export {
  archRise,
  traceArch,
  type ArchEnd,
  type ArchProfileOptions,
  type ArchStyle,
} from "./shapes/ArchProfile";

//------------------------------
//  Sky
//------------------------------
//  Viewer-relative layers: direction without location. Each pins itself to the active camera, so
//  `scene.add(layer)` is the whole contract — never reachable, and they stack freely together.

export { FullMoon, type FullMoonHaloOptions, type FullMoonOptions } from "./sky/FullMoon";
export {
  StarField,
  type StarBurstShapeOptions,
  type StarFieldOptions,
  type StarFieldOrientation,
} from "./sky/StarField";

//------------------------------
//  Sweep
//------------------------------

export { miterFrames, type MiterFramesOptions } from "./sweep/MiterFrames";
export { circleProfile, rectProfile } from "./sweep/Profiles";
export { sweep, transportFrames, type Station, type SweepOptions } from "./sweep/Sweep";

//------------------------------
//  Textures
//------------------------------

export { createCheckerboardTexture, type CheckerboardTextureOptions } from "./textures/checkerboard";
export {
  createRadialGradientTexture,
  type RadialGradientStop,
  type RadialGradientTextureOptions,
} from "./textures/radialGradient";

//------------------------------
//  Utils
//------------------------------

export * from "./utils/AlignToEdge";
export * from "./utils/AlignToRow";
export * from "./utils/AlignToSurface";
export * from "./utils/Center";
export * from "./utils/ColorUtils";
export * from "./utils/FindClosestPoint";
export * from "./utils/GeometryBuffers";
export * from "./utils/OffsetLoop";
export * from "./utils/InterpolateCurve";
export * from "./utils/LineEquations";
export { lockToViewer } from "./utils/LockToViewer";
export * from "./utils/ParametricCurveUtils";
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
