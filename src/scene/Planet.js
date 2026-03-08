import * as THREE from 'three';
import { degToRad } from 'three/src/math/MathUtils.js';
import { CelestialBody } from './CelestialBody.js';

// Golden angle in radians for spreading bodies around the orbit
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Counter to assign each planet a unique spread angle
let planetIndex = 0;

export function resetPlanetIndex() {
  planetIndex = 0;
}

export class Planet extends CelestialBody {
  constructor(bodyData) {
    super(bodyData);

    this.orbitalRadius = bodyData.displayOrbitalRadius;

    const geometry = new THREE.SphereGeometry(bodyData.displayRadius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: bodyData.color,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = degToRad(bodyData.axialTilt);
    this.add(this.mesh);

    // Position using golden-angle spread
    const angle = planetIndex * GOLDEN_ANGLE;
    planetIndex++;
    this.position.set(
      Math.cos(angle) * this.orbitalRadius,
      0,
      Math.sin(angle) * this.orbitalRadius,
    );

    // Store initial angle for later animation
    this.orbitalAngle = angle;
  }

  update(simDelta) {
    // Orbital motion
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
