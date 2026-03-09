import * as THREE from 'three';
import { positions, sizes, colors, namedStars } from '../data/stars.js';

const _vec3 = new THREE.Vector3();
const _hitResult = { name: '', distLy: null };

export class Starfield extends THREE.Points {
  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPixelRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float core = exp(-dist * dist * 32.0);
          float glow = exp(-dist * dist * 8.0);
          float alpha = core * 0.8 + glow * 0.4;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor * (core + glow * 0.3), alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    super(geometry, material);

    this.frustumCulled = false;

    // Rotate from equatorial (J2000) to ecliptic coordinates
    this.rotation.x = -23.4 * (Math.PI / 180);
  }

  updatePixelRatio(pr) {
    this.material.uniforms.uPixelRatio.value = pr;
  }

  hitTest(ndcX, ndcY, camera, thresholdPx = 20) {
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    const cursorX = ndcX * halfW + halfW;
    const cursorY = -ndcY * halfH + halfH;

    let found = false;
    let bestDist = thresholdPx * thresholdPx;

    for (let k = 0; k < namedStars.length; k++) {
      const star = namedStars[k];
      const idx = star.i * 3;

      _vec3.set(positions[idx], positions[idx + 1], positions[idx + 2]);
      _vec3.applyMatrix4(this.matrixWorld);
      _vec3.project(camera);

      if (_vec3.z > 1) continue;

      const dx = _vec3.x * halfW + halfW - cursorX;
      const dy = -_vec3.y * halfH + halfH - cursorY;
      const d2 = dx * dx + dy * dy;

      if (d2 < bestDist) {
        bestDist = d2;
        _hitResult.name = star.n;
        _hitResult.distLy = star.d;
        found = true;
      }
    }

    return found ? _hitResult : null;
  }
}
