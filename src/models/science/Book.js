import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";

class Book extends Group {
  constructor() {
    super();

    // Book Cover Geometry (Front and Back covers extending beyond the pages)
    const coverGeometry = new BoxGeometry(1.6, 0.05, 2.1); // Cover is slightly larger to extend beyond the pages
    const coverMaterial = new MeshStandardMaterial({ color: 0x8b0000 });

    // Create the front and back covers
    const frontCoverMesh = new Mesh(coverGeometry, coverMaterial);
    const backCoverMesh = new Mesh(coverGeometry, coverMaterial);

    // Position the front and back covers
    frontCoverMesh.position.set(0, 0.125, 0); // Slightly above the pages
    backCoverMesh.position.set(0, -0.125, 0); // Slightly below the pages

    // Pages Geometry (slightly smaller to fit neatly inside the cover)
    const pagesGeometry = new BoxGeometry(1.55, 0.2, 2.0); // Pages are smaller to sit inside the cover comfortably
    const pagesMaterial = new MeshStandardMaterial({ color: 0xffffff }); // White color for pages
    const pagesMesh = new Mesh(pagesGeometry, pagesMaterial);

    // Position the pages between the covers
    pagesMesh.position.set(-0.025, 0, 0); // Positioned at the center between front and back covers

    // Create a spine for extra detail
    const spineGeometry = new BoxGeometry(0.05, 0.25, 2.1); // Spine with thickness and same length as the cover
    const spineMaterial = new MeshStandardMaterial({ color: 0x4b0000 }); // Darker shade for the spine
    const spineMesh = new Mesh(spineGeometry, spineMaterial);
    spineMesh.position.set(-0.8, 0, 0); // Positioned on one side to represent the book's spine

    // Group the parts together to form the book
    this.add(frontCoverMesh);
    this.add(backCoverMesh);
    this.add(pagesMesh);
    this.add(spineMesh);
  }
}

export { Book };
