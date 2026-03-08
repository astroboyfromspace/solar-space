import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { CelestialBody } from './CelestialBody.js';
import { applyTextureOpts } from '../loaders/TextureManager.js';

function createFlareTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, 'rgba(255, 255, 200, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 180, 50, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 150, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

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

    // Lens flare
    const flareTexture = createFlareTexture();
    const lensflare = new Lensflare();
    lensflare.addElement(new LensflareElement(flareTexture, 700, 0));
    lensflare.addElement(new LensflareElement(flareTexture, 100, 0.6));
    lensflare.addElement(new LensflareElement(flareTexture, 70, 0.7));
    lensflare.addElement(new LensflareElement(flareTexture, 120, 0.9));
    lensflare.addElement(new LensflareElement(flareTexture, 60, 1.0));
    this.light.add(lensflare);
  }

  update(simDelta) {
    super.update(simDelta);
    if (simDelta) this.light.shadow.needsUpdate = true;
  }
}
