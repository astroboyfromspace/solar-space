import * as THREE from 'three';

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export class CelestialBody extends THREE.Group {
  constructor(bodyData) {
    super();
    this.bodyData = bodyData;
    this.name = bodyData.name;

    this.orbitalRadius = bodyData.displayOrbitalRadius;
    this.orbitalAngle = 0;

    // Precompute angular velocities (rad/sim-second)
    const orbP = bodyData.orbitalPeriod;
    this.orbitalAngularVelocity = orbP ? (2 * Math.PI) / (orbP * 86400) : 0;

    const rotP = bodyData.rotationPeriod;
    this.rotationAngularVelocity = rotP
      ? (Math.sign(rotP) * 2 * Math.PI) / (Math.abs(rotP) * 86400)
      : 0;
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
