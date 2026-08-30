import GUI from "lil-gui";
import {
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  TorusKnotGeometry,
  Vector3,
} from "three";
import { GroundGrid } from "three-low-poly";
import { createScene } from "../../../framework/createScene";

export const meta = {
  title: "Perspective to Orthographic",
  description:
    "STUDY — one dial carrying a camera continuously from perspective to orthographic, with a real " +
    "projection at every value rather than a blend of two matrices. " +
    "The naive approaches both fail. Lerping a perspective matrix against an orthographic one is not a " +
    "projection at any intermediate value — the two disagree about the `w` divide, so what comes out " +
    "between them is not a view of anything. Simply widening an orthographic frustum never becomes " +
    "perspective at all. What DOES work is the move a cinematographer already knows: a DOLLY ZOOM run to " +
    "its limit. Narrow the field of view and pull the eye back together, holding the framed height " +
    "constant, and the vanishing point walks off toward infinity. Perspective becomes orthographic in the " +
    "limit because that is what orthographic IS — a perspective view from infinitely far away. " +
    "The invariant is FRAMED HEIGHT, `2·d·tan(fov/2)` at the focus plane. Everything else is derived from " +
    "holding it: the angle narrows toward one degree, and the distance that keeps the frame the same " +
    "height is `h / (2·tan(f/2))`. " +
    "THE PUSHBACK GOES INTO THE PROJECTION MATRIX, NOT THE CAMERA POSITION, and that ordering is the " +
    "whole thing. Move the eye four hundred metres from geometry sitting at four, and every vertex's x " +
    "and y are differenced against a huge number before the perspective divide — float32 loses its low " +
    "bits and the image visibly shakes as the camera turns. Applied as a translation along view Z, after " +
    "the world has already been brought into a view space centred on the subject, x and y never meet the " +
    "large number at all. Toggle Pushback In Position to put it back the wrong way and watch the readout " +
    "measure the jitter. " +
    "Two caps make it survivable. The angle cannot reach zero, because the compensating distance runs to " +
    "infinity, so it stops at one degree and the last two percent snaps to a TRUE orthographic matrix — " +
    "which needs no pushback at all, having no vanishing point to push toward. And the pushback itself is " +
    "capped at forty times the focus distance, because past there float32 gives out; the angle is then " +
    "re-derived FROM the clamped distance rather than the other way round, so the framing stays exact " +
    "even where the clamp bites. The clip planes travel with the pushback, or the scene simply vanishes. " +
    "Ported from `GraphicsKit/Sources/GXRender/Camera.swift` in the Swift/MetalKit port, where this was " +
    "solved first. Nothing in the library implements it; this is a study of whether it belongs.",
};

//------------------------------
//  Vocabulary
//------------------------------
//
//  PERSPECTIVENESS  the dial. 1 is the authored field of view, 0 is orthographic.
//  FRAMED HEIGHT    `2·d·tan(fov/2)` — how much the frame covers at the focus plane. THE invariant.
//  FOCUS DISTANCE   how far the plane the framing is measured at sits. An orbit camera's target.
//  PUSHBACK         how far the blend moves the eye back beyond the focus distance.
//  DOLLY ZOOM       narrowing the angle and pulling back together, holding the subject's size. The
//                   Vertigo shot. Run to its limit it IS the orthographic projection.
//
//  Deliberately NOT here: a second camera, or any blending of two matrices. There is one camera and one
//  projection, and it is a real projection at every value of the dial.

/** The narrowest angle the blend will use. It cannot reach zero — the compensating distance would not. */
const NARROWEST_ANGLE = (1 * Math.PI) / 180;

/** Below this, a true orthographic projection. Under two degrees, nothing is given up by snapping. */
const ORTHOGRAPHIC_THRESHOLD = 0.02;

/** The furthest the eye is pushed, as a multiple of the focus distance. Past this, float32 gives out. */
const MAXIMUM_PUSHBACK = 40;

interface Blend {
  orthographic: boolean;
  /** The angle actually used, derived from the CLAMPED distance so the framing stays exact. */
  fieldOfView: number;
  /** Where the eye effectively sits. */
  distance: number;
  /** How far beyond the focus distance that is. */
  pushback: number;
  /** The invariant: how much the frame covers at the focus plane. */
  framedHeight: number;
}

/**
 * Solve the blend for one value of the dial.
 *
 * Everything is derived from holding `framedHeight` constant. The angle narrows toward one degree, the
 * distance that keeps the frame the same height follows, and the distance is then clamped — after which
 * the angle is re-derived FROM the clamp rather than the other way round, so the promise the blend makes
 * is kept even where the cap bites.
 */
function solveBlend(perspectiveness: number, fieldOfView: number, focusDistance: number): Blend {
  const framedHeight = 2 * focusDistance * Math.tan(fieldOfView / 2);
  const t = Math.min(1, Math.max(0, perspectiveness));

  if (t >= 1) {
    return { orthographic: false, fieldOfView, distance: focusDistance, pushback: 0, framedHeight };
  }

  // A real orthographic projection has no vanishing point to push toward, so it needs no pushback.
  if (t <= ORTHOGRAPHIC_THRESHOLD) {
    return { orthographic: true, fieldOfView, distance: focusDistance, pushback: 0, framedHeight };
  }

  const blendAngle = NARROWEST_ANGLE + (fieldOfView - NARROWEST_ANGLE) * t;
  const ideal = framedHeight / (2 * Math.tan(blendAngle / 2));
  const distance = Math.min(ideal, focusDistance * MAXIMUM_PUSHBACK);

  return {
    orthographic: false,
    // Derived from the clamped distance — this is what keeps the frame its promised height.
    fieldOfView: 2 * Math.atan(framedHeight / (2 * distance)),
    distance,
    pushback: distance - focusDistance,
    framedHeight,
  };
}

export default function (container: HTMLElement) {
  const handle = createScene(container, { background: 0x12161c, cameraPosition: [4.2, 2.6, 5.2] });
  const { scene, camera, controls, onFrame, dispose } = handle;

  const key = new DirectionalLight(0xfff4e6, 1.6);
  key.position.set(4, 6, 4);
  const fill = new DirectionalLight(0x8ea8cc, 0.45);
  fill.position.set(-4, 1.5, -3);
  scene.add(key, fill);

  scene.add(new GroundGrid({ size: 20, divisions: 20 }));

  // A subject with depth in it. The blend is only legible against something that RECEDES — a flat
  // elevation looks identical either way, which is the whole reason orthographic drawing exists.
  const stage = new Group();
  const stone = new MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.85, flatShading: true });
  const metal = new MeshStandardMaterial({ color: 0x9aa4b2, metalness: 0.6, roughness: 0.4, flatShading: true });

  for (let i = 0; i < 6; i++) {
    const post = new Mesh(new CylinderGeometry(0.16, 0.18, 1.6 + i * 0.12, 8), stone);
    post.position.set(-4 + i * 1.6, (1.6 + i * 0.12) / 2, -2);
    stage.add(post);
  }
  for (let i = 0; i < 5; i++) {
    const block = new Mesh(new BoxGeometry(0.9, 0.9, 0.9), stone);
    block.position.set(-3 + i * 1.5, 0.45, 1.5);
    stage.add(block);
  }
  const knot = new Mesh(new TorusKnotGeometry(0.6, 0.2, 96, 12), metal);
  knot.position.set(0, 1.4, 0);
  stage.add(knot);
  scene.add(stage);

  const params = {
    perspectiveness: 1,
    fieldOfView: 50,
    pushbackInPosition: false,
    spin: true,

    projection: "",
    framing: "",
    jitter: "",
    note: "",
  };

  // The camera's authored pose, kept apart from anything the blend does to it.
  const pose = new Vector3();
  const translation = new Matrix4();
  const projection = new Matrix4();

  // Jitter probe: where a fixed world point lands in clip space, sampled frame to frame. The wrong
  // construction shows up here as a number long before the eye can see it shimmer.
  const probe = new Vector3(3, 1, 3);
  const clip = new Vector3();
  let previousClip: Vector3 | null = null;
  let worstJitter = 0;
  let jitterFrames = 0;

  const apply = () => {
    const focus = Math.max(1e-4, camera.position.distanceTo(controls.target));
    const fov = (params.fieldOfView * Math.PI) / 180;
    const blend = solveBlend(params.perspectiveness, fov, focus);

    const aspect = Math.max(0.001, container.clientWidth / Math.max(1, container.clientHeight));
    // The clip planes travel with the pushback. Without this the eye ends up further back than the far
    // plane and the scene disappears entirely.
    const scale = blend.distance / focus;
    const near = Math.max(0.01 * scale, 1e-4);
    const far = Math.max(200 * scale, near + 1e-3);

    if (blend.orthographic) {
      const height = blend.framedHeight;
      const width = height * aspect;
      projection.makeOrthographic(-width / 2, width / 2, height / 2, -height / 2, near, far, camera.coordinateSystem);
    } else {
      const top = near * Math.tan(blend.fieldOfView / 2);
      const height = 2 * top;
      const width = height * aspect;
      projection.makePerspective(-width / 2, width / 2, top, top - height, near, far, camera.coordinateSystem);

      if (blend.pushback > 0) {
        if (params.pushbackInPosition) {
          // THE WRONG WAY, kept as a switch. Moving the eye means every vertex's x and y are differenced
          // against a huge number before the divide; float32 loses the low bits and the image shakes.
          camera.position.copy(pose).addScaledVector(
            new Vector3().subVectors(pose, controls.target).normalize(),
            blend.pushback,
          );
          camera.updateMatrixWorld(true);
        } else {
          // A shift along view Z, applied AFTER the world is already in a view space centred on the
          // subject — so x and y never meet the large number at all.
          projection.multiply(translation.makeTranslation(0, 0, -blend.pushback));
        }
      }
    }

    camera.projectionMatrix.copy(projection);
    camera.projectionMatrixInverse.copy(projection).invert();

    // Measure the jitter rather than describe it: project a fixed world point and watch it frame to frame.
    clip.copy(probe).project(camera);
    if (previousClip) {
      const drift = clip.distanceTo(previousClip);
      // Only meaningful while the view is moving; a still camera drifts by nothing either way.
      if (params.spin) {
        worstJitter = Math.max(worstJitter, drift);
        jitterFrames++;
      }
    } else {
      previousClip = new Vector3();
    }
    previousClip.copy(clip);

    params.projection = blend.orthographic
      ? "TRUE orthographic — snapped, no pushback"
      : `perspective ${((blend.fieldOfView * 180) / Math.PI).toFixed(2)}° · pushback ${blend.pushback.toFixed(2)}${blend.distance >= focus * MAXIMUM_PUSHBACK - 1e-6 ? " (CLAMPED at 40×)" : ""}`;
    params.framing = `framed height ${blend.framedHeight.toFixed(4)} at focus ${focus.toFixed(3)} — held constant`;
    params.note = params.pushbackInPosition
      ? "pushback in POSITION — the wrong way, watch the jitter"
      : "pushback in the PROJECTION — a shift along view Z";
  };

  // The blend has to be re-solved every frame, because the focus distance is whatever the orbit
  // controller currently has and the user is free to move it.
  const stop = onFrame((delta) => {
    if (params.spin) {
      // A slow orbit, because the jitter of a bad construction only appears while the view is moving.
      const angle = delta * 0.25;
      const offset = new Vector3().subVectors(camera.position, controls.target);
      offset.applyAxisAngle(new Vector3(0, 1, 0), angle);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      controls.update();
    }
    pose.copy(camera.position);
    apply();

    if (jitterFrames > 8) {
      params.jitter =
        worstJitter < 1e-6
          ? `${worstJitter.toExponential(2)} clip units — steady`
          : `${worstJitter.toExponential(2)} clip units per frame${worstJitter > 1e-3 ? " — VISIBLY SHAKING" : ""}`;
    }
  });

  const gui = new GUI();
  gui.title("Perspective to Orthographic");

  const blend = gui.addFolder("Blend");
  // THE dial. 1 is the authored field of view; 0 is orthographic; everything between is a real projection.
  blend.add(params, "perspectiveness", 0, 1, 0.005).name("Perspectiveness").onChange(apply);
  blend.add(params, "fieldOfView", 15, 90, 1).name("Field of View °").onChange(apply);
  blend.open();

  const construction = gui.addFolder("Construction");
  // The switch that makes the finding visible. On is the wrong way, kept so the cost can be measured.
  construction
    .add(params, "pushbackInPosition")
    .name("Pushback In Position")
    .onChange(() => {
      worstJitter = 0;
      jitterFrames = 0;
      apply();
    });
  // The jitter only appears while the view moves, so the study orbits by itself.
  construction
    .add(params, "spin")
    .name("Orbit")
    .onChange(() => {
      worstJitter = 0;
      jitterFrames = 0;
    });
  construction.open();

  const readout = gui.addFolder("Readout");
  readout.add(params, "projection").name("Projection").listen().disable();
  readout.add(params, "framing").name("Framing").listen().disable();
  readout.add(params, "jitter").name("Clip-space Jitter").listen().disable();
  readout.add(params, "note").name("Construction").listen().disable();
  readout.open();

  return () => {
    gui.destroy();
    stop();
    // Hand the camera back the projection it came with, or the next example inherits this one.
    camera.updateProjectionMatrix();
    stone.dispose();
    metal.dispose();
    stage.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
    dispose();
  };
}
