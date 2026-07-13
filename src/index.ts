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
export { FlameFlickerEffect, type FlameFlickerEffectOptions } from "./effects/FlameFlickerEffect";
export { GlowHalo, type GlowHaloOptions } from "./effects/GlowHalo";
export { GroundFogEffect, type GroundFogEffectOptions } from "./effects/GroundFogEffect";
export { LightningEffect, type LightningEffectOptions } from "./effects/LightningEffect";
export { PetalDriftEffect, type PetalDriftEffectOptions } from "./effects/PetalDriftEffect";
export { RainEffect, type RainEffectOptions } from "./effects/RainEffect";
export {
  StarFieldEffect,
  type StarBurstShapeOptions,
  type StarFieldEffectOptions,
  type StarFieldOrientation,
} from "./effects/StarFieldEffect";
export { WispEffect, type WispEffectOptions } from "./effects/WispEffect";

//------------------------------
//  Factory
//------------------------------

export * from "./factory/BookFactory";
export * from "./factory/BoulderFactory";
export * from "./factory/FenceFactory";
export * from "./factory/HeadstoneFactory";
export * from "./factory/HexagonalTileFactory";
export * from "./factory/RockFactory";
export * from "./factory/StaircaseFactory";

//------------------------------
//  Geometries
//------------------------------

// Architecture
export { ArchGeometry, type ArchGeometryOptions } from "./geometry/architecture/ArchGeometry";
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
export { JarGeometry } from "./geometry/vessels/JarGeometry";
export { PotionBottleGeometry } from "./geometry/vessels/PotionBottleGeometry";
export { VaseGeometry, type VaseGeometryOptions } from "./geometry/vessels/VaseGeometry";
export { WineBottleGeometry, type WineBottleGeometryOptions } from "./geometry/vessels/WineBottleGeometry";

// Cemetery
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
export { RoundedHeadstoneGeometry } from "./geometry/cemetery/RoundedHeadstoneGeometry";
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
export { GearGeometry, type GearGeometryOptions } from "./geometry/shapes/GearGeometry";
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

// Trees
export {
  GnarledTreeGeometry,
  type GnarledTreeGeometryOptions,
} from "./geometry/trees/GnarledTreeGeometry";
export { TreeGeometry, type TreeGeometryOptions } from "./geometry/trees/TreeGeometry";

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

// Books
export { Book, type BookOptions } from "./models/books/Book";

// Bottles
export { Jar } from "./models/vessels/Jar";
export { PotionBottle } from "./models/vessels/PotionBottle";
export { Vase, type VaseOptions } from "./models/vessels/Vase";
export { WineBottle, type WineBottleOptions } from "./models/vessels/WineBottle";

// Cemetery
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
export { Lantern, type LanternOptions } from "./models/lighting/Lantern";

// Rocks
export { Boulder, type BoulderOptions } from "./models/rocks/Boulder";
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
export { ArchedSlab, type ArchedSlabOptions } from "./models/shapes/ArchedSlab";
export { Burst, type BurstOptions } from "./models/shapes/Burst";
export { Club, type ClubOptions } from "./models/shapes/Club";
export { Gear, type GearOptions } from "./models/shapes/Gear";
export { Heart, type HeartOptions } from "./models/shapes/Heart";
export { Polygon, type PolygonOptions } from "./models/shapes/Polygon";
export { Spade, type SpadeOptions } from "./models/shapes/Spade";
export { Star, type StarOptions } from "./models/shapes/Star";

// Skeleton
export { Bone } from "./models/skeleton/Bone";

// Trees
export { GnarledTree, type GnarledTreeOptions } from "./models/trees/GnarledTree";
export { Tree, type TreeOptions } from "./models/trees/Tree";

// Terrain
export { TerrainMound, type TerrainMoundOptions } from "./models/terrain/TerrainMound";
export { TerrainPlane, type TerrainPlaneOptions } from "./models/terrain/TerrainPlane";

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

export { ArchedSlabShape, type ArchedSlabShapeOptions } from "./shapes/ArchedSlabShape";
export { BurstShape, type BurstShapeOptions } from "./shapes/BurstShape";
export { ClubShape, type ClubShapeOptions } from "./shapes/ClubShape";
export { GearShape, type GearShapeOptions } from "./shapes/GearShape";
export { HeartShape, type HeartShapeOptions } from "./shapes/HeartShape";
export { PolygonShape, type PolygonShapeOptions } from "./shapes/PolygonShape";
export { SpadeShape, type SpadeShapeOptions } from "./shapes/SpadeShape";
export { StarShape, type StarShapeOptions } from "./shapes/StarShape";

//------------------------------
//  Sweep
//------------------------------

export { circleProfile, rectProfile } from "./sweep/Profiles";
export { sweep, transportFrames, type Station, type SweepOptions } from "./sweep/Sweep";

//------------------------------
//  Textures
//------------------------------

export { checkerboardTexture } from "./textures/checkerboard";

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
export * from "./utils/InterpolateCurve";
export * from "./utils/LineEquations";
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
