import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';
import { loadTexture, applyTextureOpts } from '../loaders/TextureManager.js';
import { Atmosphere } from './Atmosphere.js';
import { createEarthMaterial } from './EarthMaterial.js';
import { createCloudMaterial } from './CloudMaterial.js';

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
      const cloudGeometry = new THREE.SphereGeometry(bodyData.displayRadius * 1.01, 128, 128);
      const cloudMaterial = createCloudMaterial(cloudTexture);
      this.cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
      this.cloudAngularVelocity = this.rotationAngularVelocity * 0.05;
      this.mesh.add(this.cloudMesh);
      material.uniforms.uCloudMap.value = cloudTexture;
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

    // Compute sun direction once for atmosphere, surface, and cloud shaders
    const earthUniforms = this.mesh.material.uniforms;
    if (this.atmosphere || earthUniforms?.uSunDirection) {
      this.getWorldPosition(_sunDir);
      _sunDir.negate().normalize();
    }

    if (this.atmosphere) {
      this.atmosphere.material.uniforms.uSunDirection.value.copy(_sunDir);
    }

    if (earthUniforms?.uSunDirection) {
      earthUniforms.uSunDirection.value.copy(_sunDir);

      if (this.cloudMesh) {
        this.cloudMesh.material.uniforms.uSunDirection.value.copy(_sunDir);

        const cloudRotOffset = this.cloudMesh.rotation.y - this.mesh.rotation.y;
        const parallaxScale = 0.004;
        const sunElev = Math.max(Math.abs(_sunDir.z), 0.25);
        earthUniforms.uCloudShadowOffset.value.set(
          _sunDir.x * parallaxScale / sunElev + cloudRotOffset / (2 * Math.PI),
          -_sunDir.y * parallaxScale / sunElev
        );
      }
    }
  }
}
