import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';
import { applyTextureOpts } from '../loaders/TextureManager.js';

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
  }
}
