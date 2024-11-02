import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";

class ElectricPanel extends Group {
  constructor() {
    super();

    // Panel base geometry
    const panelGeometry = new BoxGeometry(3, 4, 0.1);
    const panelMaterial = new MeshStandardMaterial({
      color: 0x2e2e2e,
      roughness: 0.8,
      metalness: 0.6,
    });

    // Create switches and dials
    const switchGeometry = new BoxGeometry(0.2, 0.5, 0.2);
    const switchMaterial = new MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.5,
      metalness: 0.7,
    });

    const dialGeometry = new CylinderGeometry(0.3, 0.3, 0.1, 16);
    const dialMaterial = new MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.7,
      metalness: 0.5,
    });

    // Create panel and switches
    const panel = new Mesh(panelGeometry, panelMaterial);

    // Add multiple switches and dials
    const switches = [];
    for (let i = -1; i <= 1; i++) {
      const toggleSwitch = new Mesh(switchGeometry, switchMaterial);
      toggleSwitch.position.set(i, 1.5, 0.1);
      switches.push(toggleSwitch);
      panel.add(toggleSwitch);
    }

    const dial = new Mesh(dialGeometry, dialMaterial);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, 0.5, 0.15);
    panel.add(dial);

    // Create red indicator light
    const lightGeometry = new SphereGeometry(0.15, 8, 8);
    const lightMaterial = new MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });
    const light = new Mesh(lightGeometry, lightMaterial);
    light.position.set(0, -1, 0.1);
    panel.add(light);

    this.add(panel);

    // Define variables for flickering effect
    let flickerSpeed = 0.015; // Speed of flicker
    let flickerMaxIntensity = 0.8; // Maximum emissive intensity
    let flickerMinIntensity = 0.2; // Minimum emissive intensity

    // Main render loop
    function animate() {
      requestAnimationFrame(animate);

      // Create a flicker effect by adjusting the emissive intensity
      const flickerIntensity = flickerMinIntensity + Math.abs(Math.sin(Date.now() * flickerSpeed)) * (flickerMaxIntensity - flickerMinIntensity);
      light.material.emissiveIntensity = flickerIntensity;
    }

    animate();
  }
}

export { ElectricPanel };
