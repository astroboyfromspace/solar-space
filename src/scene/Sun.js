import * as THREE from 'three';
import { degToRad } from 'three/src/math/MathUtils.js';
import { CelestialBody } from './CelestialBody.js';

export class Sun extends CelestialBody {
  constructor(bodyData) {
    super(bodyData);

    const geometry = new THREE.SphereGeometry(bodyData.displayRadius, 64, 64);
    const material = new THREE.MeshBasicMaterial({ color: bodyData.color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = degToRad(bodyData.axialTilt);
    this.add(this.mesh);

    // PointLight with no falloff so distant planets get light
    this.light = new THREE.PointLight(0xffffff, 2, 0, 0);
    this.add(this.light);
  }

  update(simDelta) {
    this.mesh.rotation.y += this.rotationAngularVelocity * simDelta;
  }
}
