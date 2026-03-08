import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';
import { loadTexture, applyTextureOpts } from '../loaders/TextureManager.js';
import { Atmosphere } from './Atmosphere.js';

export class Planet extends CelestialBody {
  constructor(bodyData) {
    super(bodyData);

    const geometry = new THREE.SphereGeometry(bodyData.displayRadius, 32, 32);
    const matOpts = applyTextureOpts({ roughness: 0.8, metalness: 0.1 }, bodyData);
    const material = new THREE.MeshStandardMaterial(matOpts);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(bodyData.axialTilt);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);

    // Earth cloud layer
    this.cloudMesh = null;
    this.cloudAngularVelocity = 0;
    if (bodyData.textures?.clouds) {
      const cloudTexture = loadTexture(bodyData.textures.clouds);
      const cloudGeometry = new THREE.SphereGeometry(bodyData.displayRadius * 1.01, 32, 32);
      const cloudMaterial = new THREE.MeshStandardMaterial({
        map: cloudTexture,
        alphaMap: cloudTexture,
        transparent: true,
        depthWrite: false,
        color: 0xffffff,
      });
      this.cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
      this.cloudAngularVelocity = this.rotationAngularVelocity * 0.05;
      this.mesh.add(this.cloudMesh);
    }

    // Atmosphere halo
    if (bodyData.atmosphere) {
      this.mesh.add(new Atmosphere(bodyData.displayRadius, bodyData.atmosphere));
    }
  }

  update(simDelta) {
    super.update(simDelta);
    if (this.cloudMesh && simDelta) {
      this.cloudMesh.rotation.y += this.cloudAngularVelocity * simDelta;
    }
  }
}
