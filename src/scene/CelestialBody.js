import * as THREE from 'three';
import { INITIAL_SIM_TIME } from '../time/TimeController.js';

export class CelestialBody extends THREE.Group {
  constructor(bodyData) {
    super();
    this.bodyData = bodyData;
    this.name = bodyData.name;

    this.orbitalRadius = bodyData.displayOrbitalRadius;

    // Precompute angular velocities (rad/sim-second)
    const orbP = bodyData.orbitalPeriod;
    this.orbitalAngularVelocity = orbP ? (2 * Math.PI) / (orbP * 86400) : 0;

    const rotP = bodyData.rotationPeriod;
    this.rotationAngularVelocity = rotP
      ? (Math.sign(rotP) * 2 * Math.PI) / (Math.abs(rotP) * 86400)
      : 0;

    // Compute starting orbital angle from J2000 mean longitude
    if (bodyData.meanLongitudeJ2000 != null && this.orbitalAngularVelocity) {
      const L0 = bodyData.meanLongitudeJ2000 * (Math.PI / 180);
      this.orbitalAngle = L0 + this.orbitalAngularVelocity * INITIAL_SIM_TIME;
    } else {
      this.orbitalAngle = 0;
    }

    // Set initial position
    if (this.orbitalRadius && this.orbitalAngle) {
      this.position.set(
        Math.cos(this.orbitalAngle) * this.orbitalRadius,
        0,
        Math.sin(this.orbitalAngle) * this.orbitalRadius,
      );
    }
  }

  update(simDelta) {
    if (simDelta === 0) return;

    // Orbital motion
    if (this.orbitalAngularVelocity) {
      this.orbitalAngle += this.orbitalAngularVelocity * simDelta;
      this.position.set(
        Math.cos(this.orbitalAngle) * this.orbitalRadius,
        0,
        Math.sin(this.orbitalAngle) * this.orbitalRadius,
      );
    }

    // Self-rotation
    if (this.mesh) {
      this.mesh.rotation.y += this.rotationAngularVelocity * simDelta;
    }
  }
}
