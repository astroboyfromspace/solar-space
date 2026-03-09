import * as THREE from 'three';

const CORONA_SCALE = 1.15;

export class SunCorona extends THREE.Mesh {
  constructor(sunRadius) {
    const geometry = new THREE.SphereGeometry(sunRadius * CORONA_SCALE, 64, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorInner;
        uniform vec3 uColorOuter;
        uniform float uIntensity;
        uniform float uFalloff;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
          float innerGlow = pow(rim, uFalloff) * uIntensity;
          float outerGlow = pow(rim, uFalloff * 0.4) * uIntensity * 0.3;
          float glow = innerGlow + outerGlow;
          vec3 color = mix(uColorOuter, uColorInner, pow(rim, 2.0));
          gl_FragColor = vec4(color * glow, glow);
        }
      `,
      uniforms: {
        uColorInner: { value: new THREE.Vector3(1.0, 0.95, 0.8) },
        uColorOuter: { value: new THREE.Vector3(1.0, 0.6, 0.2) },
        uIntensity: { value: 1.10 },
        uFalloff: { value: 6 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });

    super(geometry, material);
  }
}
