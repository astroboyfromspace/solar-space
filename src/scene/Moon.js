import * as THREE from 'three';
import { CelestialBody, GOLDEN_ANGLE } from './CelestialBody.js';
import { applyTextureOpts } from '../loaders/TextureManager.js';

// Per-parent moon index for golden-angle spread
const moonIndices = new Map();

export function resetMoonIndices() {
  moonIndices.clear();
}

export class Moon extends CelestialBody {
  constructor(bodyData) {
    super(bodyData);

    const geometry = new THREE.SphereGeometry(bodyData.displayRadius, 24, 24);
    const matOpts = applyTextureOpts({ roughness: 0.8, metalness: 0.1 }, bodyData);
    const material = new THREE.MeshStandardMaterial(matOpts);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(bodyData.axialTilt);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);

    // Golden-angle spread per parent
    const idx = moonIndices.get(bodyData.parent) || 0;
    moonIndices.set(bodyData.parent, idx + 1);
    const angle = idx * GOLDEN_ANGLE;

    // Position in parent's local space
    this.position.set(
      Math.cos(angle) * this.orbitalRadius,
      0,
      Math.sin(angle) * this.orbitalRadius,
    );
    this.orbitalAngle = angle;
  }
}
