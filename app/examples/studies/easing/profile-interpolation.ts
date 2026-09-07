import GUI from "lil-gui";
import {
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
  Sprite,
  Vector2,
  Vector3,
} from "three";
import { Easing, interpolateCurve } from "three-low-poly";
import { createOrthographicScene } from "../../../framework/createOrthographicScene";
import { createTextSprite } from "../../../framework/createTextSprite";
import { gradientBackdrop } from "../../../framework/gradientBackdrop";

export const meta = {
  title: "Profile Interpolation",
  description:
    "Compare a directly sampled easing profile with a centripetal Catmull–Rom spline through those same points. Cyan lines show the actual profiles used by the lathes; orange dots show their input samples. Source and spline sampling are independent. Vessel mode keeps heights ordered, removes non-timing easing functions, and constrains spline radii and height overshoot. Experimental mode permits folded profiles and inverse/Gaussian functions. These are open surfaces: DoubleSide does not add wall thickness or a closed bottom.",
};

export default function (container: HTMLElement) {
  const { scene, camera, controls, dispose } = createOrthographicScene(container, {
    background: 0x10151d,
    frustumSize: 8.4,
    cameraPosition: [0, 2.5, 20],
    grid: false,
  });
  controls.target.set(0, 2.5, 0);
  controls.update();
  const disposeBackdrop = gradientBackdrop(scene);
  const params = {
    mode: "Vessel",
    easing: "sineInOut" as keyof typeof Easing,
    startRadius: 0.5,
    endRadius: 0.2,
    baseRadius: 0.5,
    linkBase: true,
    startHeight: 1,
    endHeight: 3,
    sourceSegments: 20,
    splineSegments: 100,
    radialSegments: 48,
    showProfiles: true,
    showPoints: true,
  };
  const allEasings = Object.keys(Easing) as (keyof typeof Easing)[];
  const vesselEasings: (keyof typeof Easing)[] = allEasings.filter((name) => name !== "inverse" && name !== "gaussian");
  const surfaceMaterial = new MeshStandardMaterial({ color: 0x448fbc, roughness: 0.32, metalness: 0.2, side: DoubleSide });
  const profileMaterial = new LineBasicMaterial({ color: 0x72d9ed });
  const pointsMaterial = new MeshBasicMaterial({ color: 0xffbb66, depthTest: false });
  const markerGeometry = new SphereGeometry(0.04, 8, 6);
  const markerMatrix = new Matrix4();
  const guideMaterial = new LineBasicMaterial({ color: 0x445362 });
  const guideGeometry = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0),
    new Vector3(2, 0, 0),
    new Vector3(2, 5, 0),
    new Vector3(0, 5, 0),
    new Vector3(0, 0, 0),
  ]);
  const labels: Sprite[] = [];
  function label(text: string, x: number, y: number, scale: number) {
    const sprite = createTextSprite(text, { size: 64, scale, x, y });
    labels.push(sprite);
    scene.add(sprite);
  }
  const samples = [-4.5, 4.5].map((x, index) => {
    const group = new Group();
    group.position.x = x;
    const mesh = new Mesh(new BufferGeometry(), surfaceMaterial);
    mesh.position.x = 1;
    const profileGroup = new Group();
    profileGroup.position.x = -3.3;
    const profile = new Line(new BufferGeometry(), profileMaterial);
    const points = new InstancedMesh(markerGeometry, pointsMaterial, 53);
    points.frustumCulled = false;
    const guide = new Line(guideGeometry, guideMaterial);
    guide.position.z = -0.02;
    profileGroup.add(guide, profile, points);
    group.add(mesh, profileGroup);
    scene.add(group);
    label(index === 0 ? "Direct Samples" : "Catmull–Rom", x, 5.8, 0.65);
    label("Profile → revolved surface", x, -0.65, 0.42);
    return { mesh, profileGroup, profile, points };
  });
  const status = { profile: "", note: "" };

  function sourcePoints() {
    const transition = interpolateCurve(
      Easing[params.easing],
      params.startRadius,
      params.endRadius,
      params.startHeight,
      params.endHeight,
      params.sourceSegments,
    );
    const radius = params.linkBase ? params.startRadius : params.baseRadius;
    const raw = [new Vector2(radius, 0), new Vector2(radius, params.startHeight), ...transition];
    // Avoid repeated points at the base/transition junction (the old default had one).
    const unique = raw.filter((point, index) => index === 0 || point.distanceToSquared(raw[index - 1]) > 1e-12);
    // A collapsed experimental profile still needs two entries for Three.js sampling.
    return unique.length > 1 ? unique : [unique[0], unique[0].clone()];
  }

  function rebuild() {
    if (params.mode === "Vessel") {
      if (!vesselEasings.includes(params.easing)) params.easing = "sineInOut";
      params.startHeight = Math.max(0, Math.min(4.9, params.startHeight));
      params.endHeight = Math.max(params.startHeight + 0.1, params.endHeight);
    }
    const direct = sourcePoints();
    const curve = new CatmullRomCurve3(
      direct.map((p) => new Vector3(p.x, p.y, 0)),
      false,
      "centripetal",
    );
    const smooth = curve.getPoints(params.splineSegments).map((p) => new Vector2(p.x, p.y));
    let constrained = false;
    if (params.mode === "Vessel") {
      let previousHeight = 0;
      for (const point of smooth) {
        const radius = Math.max(0, point.x);
        const height = Math.max(previousHeight, Math.min(params.endHeight, point.y));
        if (Math.abs(radius - point.x) > 1e-8 || Math.abs(height - point.y) > 1e-8) constrained = true;
        point.set(radius, height);
        previousHeight = height;
      }
    }
    [direct, smooth].forEach((profile, index) => {
      const sample = samples[index];
      sample.mesh.geometry.dispose();
      sample.profile.geometry.dispose();

      sample.mesh.geometry = new LatheGeometry(profile, params.radialSegments);
      sample.profile.geometry = new BufferGeometry().setFromPoints(profile.map((p) => new Vector3(p.x, p.y, 0)));
      sample.points.count = direct.length;
      direct.forEach((point, i) => {
        markerMatrix.makeTranslation(point.x, point.y, 0.03);
        sample.points.setMatrixAt(i, markerMatrix);
      });
      sample.points.instanceMatrix.needsUpdate = true;
      sample.profileGroup.visible = params.showProfiles;
      sample.points.visible = params.showPoints;
    });
    status.profile = `${direct.length} input / ${smooth.length} spline points`;
    status.note =
      params.mode === "Experimental"
        ? "Raw spline; folds/overshoot allowed"
        : constrained
          ? "Spline overshoot constrained"
          : "Ordered heights; nonnegative radii";
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
  }

  const gui = new GUI();
  gui.title("Profile Interpolation");
  gui
    .add(params, "mode", ["Vessel", "Experimental"])
    .name("Mode")
    .onChange(() => {
      if (params.mode === "Vessel" && !vesselEasings.includes(params.easing)) params.easing = "sineInOut";
      easingControl.options(params.mode === "Vessel" ? vesselEasings : allEasings);
      rebuild();
    });
  const easingControl = gui.add(params, "easing", vesselEasings).name("Easing").onChange(rebuild);
  const shape = gui.addFolder("Profile");
  shape.add(params, "startRadius", 0, 2, 0.01).name("Start Radius").onChange(rebuild);
  shape.add(params, "endRadius", 0, 2, 0.01).name("End Radius").onChange(rebuild);
  shape.add(params, "startHeight", 0, 5, 0.05).name("Start Height").onChange(rebuild);
  shape.add(params, "endHeight", 0, 5, 0.05).name("End Height").onChange(rebuild);
  shape
    .add(params, "linkBase")
    .name("Link Base to Start Radius")
    .onChange(() => {
      baseControl.enable(!params.linkBase);
      rebuild();
    });
  const baseControl = shape.add(params, "baseRadius", 0, 2, 0.01).name("Independent Base Radius").onChange(rebuild);
  baseControl.disable();
  const sampling = gui.addFolder("Sampling");
  sampling.add(params, "sourceSegments", 2, 50, 1).name("Easing Segments").onChange(rebuild);
  sampling.add(params, "splineSegments", 5, 200, 1).name("Spline Segments").onChange(rebuild);
  sampling.add(params, "radialSegments", 8, 96, 1).name("Radial Segments").onChange(rebuild);
  const view = gui.addFolder("View");
  view
    .add(params, "showProfiles")
    .name("Show Profiles")
    .onChange(() =>
      samples.forEach((s) => {
        s.profileGroup.visible = params.showProfiles;
      }),
    );
  view
    .add(params, "showPoints")
    .name("Show Source Points")
    .onChange(() =>
      samples.forEach((s) => {
        s.points.visible = params.showPoints;
      }),
    );
  view
    .add(
      {
        reset() {
          camera.position.set(0, 2.5, 20);
          camera.zoom = 1;
          camera.updateProjectionMatrix();
          controls.target.set(0, 2.5, 0);
          controls.update();
        },
      },
      "reset",
    )
    .name("Reset View");
  view.close();
  gui.add(status, "profile").name("Samples").disable();
  gui.add(status, "note").name("Profile Status").disable();
  rebuild();

  return () => {
    gui.destroy();
    samples.forEach((sample) => {
      sample.mesh.geometry.dispose();
      sample.profile.geometry.dispose();
      sample.points.dispose();
    });
    labels.forEach((sprite) => {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    });
    surfaceMaterial.dispose();
    profileMaterial.dispose();
    pointsMaterial.dispose();
    markerGeometry.dispose();
    guideGeometry.dispose();
    guideMaterial.dispose();
    disposeBackdrop();
    dispose();
  };
}
