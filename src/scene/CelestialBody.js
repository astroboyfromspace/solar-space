import * as THREE from 'three';

export class CelestialBody extends THREE.Group {
  constructor(bodyData) {
    super();
    this.bodyData = bodyData;
    this.name = bodyData.name;

    // Precompute angular velocities (rad/sim-second)
    const orbP = bodyData.orbitalPeriod;
    this.orbitalAngularVelocity = orbP ? (2 * Math.PI) / (orbP * 86400) : 0;

    const rotP = bodyData.rotationPeriod;
    this.rotationAngularVelocity = rotP
      ? (Math.sign(rotP) * 2 * Math.PI) / (Math.abs(rotP) * 86400)
      : 0;
  }

  update(simDelta) {
    // no-op, overridden by subclasses
  }
}
