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
export * from "./factory/DiamondLatticeWindow";
export * from "./factory/GregorianLatticeWindow";
export * from "./factory/FenceFactory";
export * from "./factory/HeadstoneFactory";
export * from "./factory/HexagonalTileFactory";
export * from "./factory/AppleTree";
export * from "./factory/AutumnTree";
export * from "./factory/FlagstoneFloor";
export * from "./factory/HardwoodFloor";
export * from "./factory/PlankFloor";
export * from "./factory/PlankFloorLayout";
export * from "./factory/ProudStones";
export * from "./factory/PumpkinPatch";
export * from "./factory/RusticFence";
export * from "./factory/VotiveRack";
export * from "./factory/RockFactory";
export * from "./factory/StaircaseFactory";
export * from "./factory/StoneWall";
export * from "./factory/WindowFactory";

//------------------------------
//  Geometries
//------------------------------

// Architecture
export { ArchGeometry, type ArchGeometryOptions } from "./geometry/architecture/ArchGeometry";
export {
  GregorianLatticeGeometry,
  type GregorianLatticeGeometryOptions,
} from "./geometry/architecture/GregorianLatticeGeometry";
export {
  DiamondLatticeGeometry,
  type DiamondLatticeGeometryOptions,
} from "./geometry/architecture/DiamondLatticeGeometry";
export { PaneGeometry, type PaneGeometryOptions } from "./geometry/architecture/PaneGeometry";
export {
  MoldingGeometry,
  type MoldingGeometryOptions,
  type MoldingFacing,
  type MoldingRun,
} from "./geometry/architecture/MoldingGeometry";
export {
  PanelDoorGeometry,
  type PanelDoorGeometryOptions,
} from "./geometry/architecture/PanelDoorGeometry";
export {
  WindowFrameGeometry,
  type WindowFrameGeometryOptions,
} from "./geometry/architecture/WindowFrameGeometry";
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

// Masonry
export {
  QuoinStackGeometry,
  type QuoinPattern,
  type QuoinStackGeometryOptions,
} from "./geometry/masonry/QuoinStackGeometry";

// Leafs
export { EllipticLeafGeometry } from "./geometry/foliage/EllipticLeafGeometry";
export { LeafGeometry, type LeafGeometryOptions } from "./geometry/foliage/LeafGeometry";

// Lighting
export {
  CoachLanternGeometry,
  type CoachLanternGeometryOptions,
} from "./geometry/lighting/CoachLanternGeometry";
export {
  HangingLanternGeometry,
  type HangingLanternGeometryOptions,
} from "./geometry/lighting/HangingLanternGeometry";
export {
  WallSconceGeometry,
  type WallSconceGeometryOptions,
} from "./geometry/lighting/WallSconceGeometry";

// Primitives
export {
  EdgedBoxGeometry,
  type EdgedBoxGeometryOptions,
  type EdgeAxis,
  type EdgeEnds,
  type EdgeStyle,
} from "./geometry/primitives/EdgedBoxGeometry";

// Rocks
export { BoulderGeometry, type BoulderGeometryOptions } from "./geometry/rocks/BoulderGeometry";
export { MossyRockGeometry, type MossyRockGeometryOptions } from "./geometry/rocks/MossyRockGeometry";
export { RockGeometry, type RockGeometryOptions } from "./geometry/rocks/RockGeometry";

// Shapes
export {
  ArchedSlabGeometry,
  type ArchedSlabGeometryOptions,
} from "./geometry/architecture/ArchedSlabGeometry";
export { BurstGeometry, type BurstGeometryOptions } from "./geometry/shapes/BurstGeometry";
export { ClubGeometry, type ClubGeometryOptions } from "./geometry/shapes/ClubGeometry";
export { DiamondGeometry, type DiamondGeometryOptions } from "./geometry/shapes/DiamondGeometry";
export {
  AnnulusGeometry,
  type AnnulusGeometryOptions,
} from "./geometry/shapes/AnnulusGeometry";
export { GearGeometry, type GearGeometryOptions } from "./geometry/gears/GearGeometry";
export {
  CrossedWheelGeometry,
  type CrossedWheelGeometryOptions,
} from "./geometry/gears/CrossedWheelGeometry";
export { BevelGearGeometry, type BevelGearGeometryOptions } from "./geometry/gears/BevelGearGeometry";
export {
  InternalGearGeometry,
  type InternalGearGeometryOptions,
} from "./geometry/gears/InternalGearGeometry";
export { RackGeometry, type RackGeometryOptions } from "./geometry/gears/RackGeometry";
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
export { PestleGeometry, type PestleGeometryOptions } from "./geometry/science/PestleGeometry";
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

export { Cyclorama, type CycloramaOptions } from "./helpers/Cyclorama";
export { GroundGrid, type GroundGridOptions } from "./helpers/GroundGrid";

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

export {
  miterCuts,
  type MiterCutsOptions,
  miterFrames,
  type MiterFramesOptions,
} from "./sweep/MiterFrames";
export {
  moldingProfile,
  type MoldingProfileOptions,
  type MoldingStyle,
} from "./sweep/MoldingProfiles";
export {
  measurePath,
  type MeasurePathOptions,
  type PathMeasure,
  pointAtDistance,
  slicePath,
} from "./sweep/PathMeasure";
export {
  cutEnd,
  cutEndGeometry,
  cutSegment,
  miterPlane,
  type SegmentBounds,
  type CutPlane,
  type CutPoint,
  type CutEndOptions,
} from "./sweep/EndCut";
export { circleProfile, rectProfile } from "./sweep/Profiles";
export {
  type PathRepeat,
  repeatAlongPath,
  type RepeatAlongPathOptions,
  type RepeatAnchor,
} from "./sweep/RepeatAlongPath";
export {
  surfaceProfile,
  type SurfaceProfileOptions,
  type SurfaceStyle,
} from "./sweep/SurfaceProfiles";
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
