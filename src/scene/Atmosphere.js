import * as THREE from 'three';

const SCALE = 1.08;

export class Atmosphere extends THREE.Mesh {
  constructor(radius, options = {}) {
    const {
      color = [0.3, 0.6, 1.0],
      intensity = 1.5,
      falloff = 4.0,
    } = options;

    const geometry = new THREE.SphereGeometry(radius * SCALE, 32, 32);
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
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uFalloff;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
          float glow = pow(rim, uFalloff) * uIntensity;
          gl_FragColor = vec4(uColor * glow, glow);
        }
      `,
      uniforms: {
        uColor: { value: new THREE.Vector3(...color) },
        uIntensity: { value: intensity },
        uFalloff: { value: falloff },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });

    super(geometry, material);
  }
}
