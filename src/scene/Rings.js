import * as THREE from 'three';
import { loadTexture } from '../loaders/TextureManager.js';

export class Rings extends THREE.Mesh {
  constructor(innerRadius, outerRadius, color, texturePath) {
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);

    // Remap UVs to radial strip so ring texture maps correctly
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.hypot(x, y);
      const u = (dist - innerRadius) / (outerRadius - innerRadius);
      uv.setXY(i, u, 0.5);
    }

    let material;
    if (texturePath) {
      const ringTexture = loadTexture(texturePath);
      material = new THREE.MeshBasicMaterial({
        map: ringTexture,
        alphaMap: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
    }

    super(geometry, material);

    // Rotate to lie in XZ plane
    this.rotation.x = -Math.PI / 2;
  }
}
