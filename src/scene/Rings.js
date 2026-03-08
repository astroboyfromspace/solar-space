import * as THREE from 'three';

export class Rings extends THREE.Mesh {
  constructor(innerRadius, outerRadius, color) {
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    super(geometry, material);

    // Rotate to lie in XZ plane
    this.rotation.x = -Math.PI / 2;
  }
}
