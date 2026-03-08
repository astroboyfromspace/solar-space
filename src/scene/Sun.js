import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';
import { applyTextureOpts } from '../loaders/TextureManager.js';

export class Sun extends CelestialBody {
  constructor(bodyData) {
    super(bodyData);

    const geometry = new THREE.SphereGeometry(bodyData.displayRadius, 64, 64);
    const material = new THREE.MeshBasicMaterial(applyTextureOpts({}, bodyData));
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(bodyData.axialTilt);
    this.add(this.mesh);

    // PointLight with no falloff so distant planets get light
    this.light = new THREE.PointLight(0xffffff, 2, 0, 0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 2048;
    this.light.shadow.mapSize.height = 2048;
    this.light.shadow.camera.near = 10;
    this.light.shadow.camera.far = 1000;
    this.light.shadow.bias = -0.001;
    this.light.shadow.normalBias = 0.5;
    this.light.shadow.autoUpdate = false;
    this.add(this.light);
  }

  update(simDelta) {
    super.update(simDelta);
    if (simDelta) this.light.shadow.needsUpdate = true;
  }
}
