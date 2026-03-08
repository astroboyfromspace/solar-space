import * as THREE from 'three';

export class Starfield extends THREE.Points {
  constructor(count = 5000, radius = 40000) {
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Random point on sphere surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 20,
      sizeAttenuation: true,
    });

    super(geometry, material);
  }
}
