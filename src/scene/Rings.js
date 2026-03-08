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
      material = new THREE.MeshStandardMaterial({
        map: ringTexture,
        alphaMap: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.05,
        depthWrite: false,
        roughness: 0.9,
        metalness: 0.0,
        color: 0xffffff,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        roughness: 0.9,
        metalness: 0.0,
      });
    }

    super(geometry, material);
    this.castShadow = true;
    this.receiveShadow = true;

    // Rotate to lie in XZ plane
    this.rotation.x = -Math.PI / 2;
  }
}
