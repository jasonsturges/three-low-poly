import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import GUI from "lil-gui";
import {
  cameraDollyAnimation,
  cameraFlythroughAnimation,
  cameraOrbitAnimation,
  cameraPendulumAnimation,
  cameraSpiralAscensionAnimation,
  cameraWobbleAnimation,
  cameraZoomInAnimation,
} from "three-low-poly";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Camera Animations" };

export default function (container: HTMLElement) {
  const { scene, camera, dispose } = createScene(container, { cameraPosition: [0, 2, 5] });

  const blueMaterial = new MeshStandardMaterial({ color: 0x0077ff });
  const blueCube = new Mesh(new BoxGeometry(1, 1, 1), blueMaterial);
  blueCube.position.set(0, 0.5, 0);
  blueCube.castShadow = true;
  scene.add(blueCube);

  const orangeMaterial = new MeshStandardMaterial({ color: 0xff7700 });
  const orangeCone = new Mesh(new ConeGeometry(0.5, 1.5, 16), orangeMaterial);
  orangeCone.position.set(-3, 0.75, -2.5);
  orangeCone.castShadow = true;
  scene.add(orangeCone);

  const yellowMaterial = new MeshStandardMaterial({ color: 0xffff00 });
  const yellowSphere = new Mesh(new SphereGeometry(0.5, 16, 16), yellowMaterial);
  yellowSphere.position.set(1.5, 0.5, 2);
  yellowSphere.castShadow = true;
  scene.add(yellowSphere);

  const greenMaterial = new MeshStandardMaterial({ color: 0x00ff00 });
  const greenCylinder = new Mesh(new CylinderGeometry(0.5, 0.5, 1, 16), greenMaterial);
  greenCylinder.position.set(3, 0.5, -4);
  greenCylinder.castShadow = true;
  scene.add(greenCylinder);

  const purpleMaterial = new MeshStandardMaterial({ color: 0x800080 });
  const purpleTorus = new Mesh(new TorusGeometry(0.5, 0.2, 16, 32), purpleMaterial);
  purpleTorus.position.set(-1.25, 0.2, 1.5);
  purpleTorus.rotation.x = Math.PI / 2;
  purpleTorus.castShadow = true;
  scene.add(purpleTorus);

  const planeGeometry = new PlaneGeometry(20, 20);
  const planeMaterial = new MeshStandardMaterial({ color: 0x808080, side: DoubleSide });
  const plane = new Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const gui = new GUI();
  gui.add(
    {
      Dolly: () => {
        cameraDollyAnimation(camera, 5, 3000, () => {
          console.log("Dolly animation complete");
        });
      },
    },
    "Dolly",
  );
  gui.add(
    {
      Flythrough: () => {
        cameraFlythroughAnimation(
          camera,
          [new Vector3(0, 5, 5), new Vector3(0, 5, -25.5), new Vector3(-20.5, 5, 0)],
          6000,
          () => {
            console.log("Flythrough animation complete");
          },
        );
      },
    },
    "Flythrough",
  );
  gui.add(
    {
      Orbit: () => {
        cameraOrbitAnimation(camera, new Vector3(0, 0, 0), 10, 5000, () => {
          console.log("Orbit animation complete");
        });
      },
    },
    "Orbit",
  );
  gui.add(
    {
      Pendulum: () => {
        cameraPendulumAnimation(camera, new Vector3(0, 5, 5), 0.5, 9000, 3, () => {
          console.log("Pendulum animation complete");
        });
      },
    },
    "Pendulum",
  );
  gui.add(
    {
      Spiral: () => {
        cameraSpiralAscensionAnimation(camera, new Vector3(0, 0, 0), 10, 300, 5, 5000, () => {
          console.log("Spiral ascension animation complete");
        });
      },
    },
    "Spiral",
  );
  gui.add(
    {
      Wobble: () => {
        cameraWobbleAnimation(camera, 0.5, 1000, () => {
          console.log("Wobble animation complete");
        });
      },
    },
    "Wobble",
  );
  gui.add(
    {
      ZoomIn: () => {
        cameraZoomInAnimation(camera, new Vector3(0, 0, 0), 120, 75, 2000, () => {
          console.log("Zoom in animation complete");
        });
      },
    },
    "ZoomIn",
  );
  gui.add(
    {
      Reset: () => {
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 0, 0);
      },
    },
    "Reset",
  );

  return () => {
    gui.destroy();
    blueCube.geometry.dispose();
    orangeCone.geometry.dispose();
    yellowSphere.geometry.dispose();
    greenCylinder.geometry.dispose();
    purpleTorus.geometry.dispose();
    planeGeometry.dispose();
    blueMaterial.dispose();
    orangeMaterial.dispose();
    yellowMaterial.dispose();
    greenMaterial.dispose();
    purpleMaterial.dispose();
    planeMaterial.dispose();
    dispose();
  };
}