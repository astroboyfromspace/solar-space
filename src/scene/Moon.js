import * as THREE from 'three';
import { degToRad } from 'three/src/math/MathUtils.js';
import { CelestialBody } from './CelestialBody.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Per-parent moon index for golden-angle spread
const moonIndices = new Map();

export function resetMoonIndices() {
  moonIndices.clear();
}

export class Moon extends CelestialBody {
  constructor(bodyData) {
    super(bodyData);

    this.orbitalRadius = bodyData.displayOrbitalRadius;

    const geometry = new THREE.SphereGeometry(bodyData.displayRadius, 24, 24);
    const material = new THREE.MeshStandardMaterial({
      color: bodyData.color,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = degToRad(bodyData.axialTilt);
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

  update(simDelta) {
    // Orbital motion (in parent's local space)
    this.orbitalAngle += this.orbitalAngularVelocity * simDelta;
    this.position.set(
      Math.cos(this.orbitalAngle) * this.orbitalRadius,
      0,
      Math.sin(this.orbitalAngle) * this.orbitalRadius,
    );

    // Self-rotation
    this.mesh.rotation.y += this.rotationAngularVelocity * simDelta;
  }
}
