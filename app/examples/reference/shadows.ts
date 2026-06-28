import {
  AmbientLight,
  BasicShadowMap,
  BoxGeometry,
  CameraHelper,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PCFSoftShadowMap,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  VSMShadowMap,
} from "three";
import GUI from "lil-gui";
import { clearDefaultLights } from "../../framework/clearDefaultLights";
import { createScene } from "../../framework/createScene";

export const meta = { title: "Shadows" };

export default function (container: HTMLElement) {
  const { scene, camera, controls, renderer, dispose } = createScene(container, {
    background: 0x87ceeb,
    cameraPosition: [15, 15, 15],
  });
  clearDefaultLights(scene);
  controls.enableDamping = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const ambientLight = new AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(10, 15, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.bias = -0.0001;
  scene.add(directionalLight);

  const shadowCameraHelper = new CameraHelper(directionalLight.shadow.camera);
  shadowCameraHelper.visible = false;
  scene.add(shadowCameraHelper);

  const plane = new Mesh(new PlaneGeometry(40, 40), new MeshStandardMaterial({ color: 0x90c890, roughness: 0.8 }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  const baseMaterial = new MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.5, metalness: 0.2 });
  const sphereGeometry = new SphereGeometry(1.5, 32, 32);
  const boxGeometry = new BoxGeometry(2.5, 2.5, 2.5);
  const coneGeometry = new ConeGeometry(1.5, 3, 32);
  const torusGeometry = new TorusGeometry(1.5, 0.5, 16, 32);
  const cylinderGeometry = new CylinderGeometry(1, 1, 3, 32);

  const sphere = new Mesh(sphereGeometry, baseMaterial.clone());
  sphere.position.set(-8, 1.5, -5);
  sphere.castShadow = sphere.receiveShadow = true;
  scene.add(sphere);

  const box = new Mesh(boxGeometry, baseMaterial.clone());
  box.material.color.set(0x4ecdc4);
  box.position.set(-4, 1.25, 0);
  box.castShadow = box.receiveShadow = true;
  scene.add(box);

  const cone = new Mesh(coneGeometry, baseMaterial.clone());
  cone.material.color.set(0xffe66d);
  cone.position.set(0, 1.5, -5);
  cone.castShadow = cone.receiveShadow = true;
  scene.add(cone);

  const torus = new Mesh(torusGeometry, baseMaterial.clone());
  torus.material.color.set(0xa8e6cf);
  torus.position.set(4, 2, 0);
  torus.rotation.x = Math.PI / 4;
  torus.castShadow = torus.receiveShadow = true;
  scene.add(torus);

  const cylinder = new Mesh(cylinderGeometry, baseMaterial.clone());
  cylinder.material.color.set(0xc7ceea);
  cylinder.position.set(8, 1.5, -5);
  cylinder.castShadow = cylinder.receiveShadow = true;
  scene.add(cylinder);

  const tallBox = new Mesh(new BoxGeometry(1.5, 8, 1.5), baseMaterial.clone());
  tallBox.material.color.set(0xff8b94);
  tallBox.position.set(-8, 4, 5);
  tallBox.castShadow = tallBox.receiveShadow = true;
  scene.add(tallBox);

  const smallSphereGeometry = new SphereGeometry(0.75, 16, 16);
  for (let i = 0; i < 5; i++) {
    const smallSphere = new Mesh(smallSphereGeometry, baseMaterial.clone());
    smallSphere.material.color.setHSL(i / 5, 0.7, 0.6);
    smallSphere.position.set(i * 2 - 4, 0.75, 8);
    smallSphere.castShadow = smallSphere.receiveShadow = true;
    scene.add(smallSphere);
  }

  const shadowMapTypes = {
    Basic: BasicShadowMap,
    PCF: PCFShadowMap,
    PCFSoft: PCFSoftShadowMap,
    VSM: VSMShadowMap,
  };

  const shadowSettings = {
    shadowMapType: "PCFSoft" as keyof typeof shadowMapTypes,
    shadowMapSize: 2048,
    shadowBias: -0.0001,
    shadowRadius: 1,
    showShadowCamera: false,
  };

  const gui = new GUI();
  const shadowFolder = gui.addFolder("Shadow Settings");
  shadowFolder
    .add(shadowSettings, "shadowMapType", Object.keys(shadowMapTypes))
    .name("Shadow Map Type")
    .onChange(() => {
      renderer.shadowMap.type = shadowMapTypes[shadowSettings.shadowMapType];
      renderer.shadowMap.needsUpdate = true;
    });
  shadowFolder
    .add(shadowSettings, "shadowMapSize", [256, 512, 1024, 2048, 4096])
    .name("Shadow Map Size")
    .onChange(() => {
      directionalLight.shadow.mapSize.width = shadowSettings.shadowMapSize;
      directionalLight.shadow.mapSize.height = shadowSettings.shadowMapSize;
      directionalLight.shadow.map?.dispose();
      directionalLight.shadow.map = null;
      renderer.shadowMap.needsUpdate = true;
    });
  shadowFolder
    .add(shadowSettings, "shadowBias", -0.01, 0.01, 0.0001)
    .name("Shadow Bias")
    .onChange(() => {
      directionalLight.shadow.bias = shadowSettings.shadowBias;
    });
  shadowFolder
    .add(shadowSettings, "shadowRadius", 0, 10, 0.1)
    .name("Shadow Radius (VSM)")
    .onChange(() => {
      directionalLight.shadow.radius = shadowSettings.shadowRadius;
    });
  shadowFolder.open();

  const lightFolder = gui.addFolder("Light Controls");
  lightFolder.add(directionalLight, "intensity", 0, 3).name("Light Intensity");
  lightFolder.add(directionalLight.position, "x", -20, 20).name("Light Position X");
  lightFolder.add(directionalLight.position, "y", 5, 30).name("Light Position Y");
  lightFolder.add(directionalLight.position, "z", -20, 20).name("Light Position Z");

  const debugFolder = gui.addFolder("Debug");
  debugFolder
    .add(shadowSettings, "showShadowCamera")
    .name("Show Shadow Camera")
    .onChange(() => {
      shadowCameraHelper.visible = shadowSettings.showShadowCamera;
    });

  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder.add(camera.position, "x", -50, 50).name("X");
  cameraFolder.add(camera.position, "y", -50, 50).name("Y");
  cameraFolder.add(camera.position, "z", -50, 50).name("Z");

  return () => {
    gui.destroy();
    shadowCameraHelper.dispose();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    dispose();
  };
}