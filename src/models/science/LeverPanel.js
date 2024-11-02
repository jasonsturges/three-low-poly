import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";

class LeverPanel extends Group {
  constructor() {
    super();

    // New panel for levers
    const leverPanelGeometry = new BoxGeometry(2, 3, 0.1);
    const leverPanelMaterial = new MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.5,
    });
    const leverPanel = new Mesh(leverPanelGeometry, leverPanelMaterial);

    // Lever geometry
    const leverBaseGeometry = new CylinderGeometry(0.1, 0.1, 0.2, 8);
    const leverHandleGeometry = new CylinderGeometry(0.05, 0.05, 1, 8);

    // Lever material
    const leverMaterial = new MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.5,
      metalness: 0.7,
    });

    // Create multiple levers
    const levers = [];
    for (let i = -0.5; i <= 0.5; i += 0.5) {
      // Lever base
      const leverBase = new Mesh(leverBaseGeometry, leverMaterial);
      leverBase.position.set(i, 1, 0.1);

      // Lever handle
      const leverHandle = new Mesh(leverHandleGeometry, leverMaterial);
      leverHandle.position.y = 0.5; // Position handle on top of the base
      // leverHandle.rotation.x = Math.PI / 4; // Tilt forward along the x-axis
      leverBase.add(leverHandle);

      // Group base and handle as a lever
      levers.push(leverHandle);
      this.add(leverBase);
    }

    // Position the panel in the scene
    this.add(leverPanel);
  }
}

export { LeverPanel };
