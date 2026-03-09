import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';
import { loadTexture, applyTextureOpts } from '../loaders/TextureManager.js';
import { Atmosphere } from './Atmosphere.js';
import { createEarthMaterial } from './EarthMaterial.js';

const _sunDir = new THREE.Vector3();

export class Planet extends CelestialBody {
  constructor(bodyData) {
    super(bodyData);

    const isEarth = !!bodyData.textures?.nightMap;
    const segments = isEarth ? 128 : 32;
    const geometry = new THREE.SphereGeometry(bodyData.displayRadius, segments, segments);

    let material;
    if (isEarth) {
      material = createEarthMaterial(bodyData);
    } else {
      const matOpts = applyTextureOpts({ roughness: 0.8, metalness: 0.1 }, bodyData);
      material = new THREE.MeshStandardMaterial(matOpts);
    }
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
      cloudTexture.wrapS = THREE.RepeatWrapping;
      const cloudSegments = isEarth ? 128 : 32;
      const cloudGeometry = new THREE.SphereGeometry(bodyData.displayRadius * 1.01, cloudSegments, cloudSegments);
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

      // Pass cloud texture to Earth's custom shader
      if (isEarth) {
        material.uniforms.uCloudMap.value = cloudTexture;
      }
    }

    // Atmosphere halo — added as sibling of mesh (not child) so renderOrder
    // correctly places it after opaque objects like moons
    this.atmosphere = null;
    if (bodyData.atmosphere) {
      this.atmosphere = new Atmosphere(bodyData.displayRadius, bodyData.atmosphere);
      this.add(this.atmosphere);
    }
  }

  update(simDelta) {
    super.update(simDelta);
    if (this.cloudMesh && simDelta) {
      this.cloudMesh.rotation.y += this.cloudAngularVelocity * simDelta;
    }
    if (this.atmosphere) {
      this.getWorldPosition(_sunDir);
      _sunDir.negate().normalize();
      this.atmosphere.material.uniforms.uSunDirection.value.copy(_sunDir);
    }

    // Update Earth custom shader uniforms
    const earthUniforms = this.mesh.material.uniforms;
    if (earthUniforms?.uSunDirection) {
      if (!this.atmosphere) {
        this.getWorldPosition(_sunDir);
        _sunDir.negate().normalize();
      }
      earthUniforms.uSunDirection.value.copy(_sunDir);

      if (this.cloudMesh) {
        const cloudRotOffset = this.cloudMesh.rotation.y - this.mesh.rotation.y;
        earthUniforms.uCloudShadowOffset.value.set(
          _sunDir.x * 0.003 + cloudRotOffset / (2 * Math.PI),
          0
        );
      }
    }
  }
}
