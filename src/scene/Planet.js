import * as THREE from 'three';
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

    const geometry = new THREE.SphereGeometry(bodyData.displayRadius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: bodyData.color,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.add(this.mesh);

    // Position using golden-angle spread
    const angle = planetIndex * GOLDEN_ANGLE;
    planetIndex++;
    this.position.set(
      Math.cos(angle) * bodyData.displayOrbitalRadius,
      0,
      Math.sin(angle) * bodyData.displayOrbitalRadius,
    );

    // Store initial angle for later animation
    this.orbitalAngle = angle;
  }
}
