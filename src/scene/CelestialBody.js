import * as THREE from 'three';

export class CelestialBody extends THREE.Group {
  constructor(bodyData) {
    super();
    this.bodyData = bodyData;
    this.name = bodyData.name;
  }
}
