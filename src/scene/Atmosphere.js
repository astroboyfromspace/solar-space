import * as THREE from 'three';

const SCALE = 1.08;

export class Atmosphere extends THREE.Mesh {
  constructor(radius, options = {}) {
    const {
      color = [0.3, 0.6, 1.0],
      sunsetColor = [1.0, 0.4, 0.1],
      intensity = 1.5,
      falloff = 4.0,
    } = options;

    const geometry = new THREE.SphereGeometry(radius * SCALE, 64, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        uniform float uRadius;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldNormal;
        varying float vPushedDepth;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          #include <logdepthbuf_vertex>
          // Depth of planet far side — pushes atmosphere behind nearby objects
          vec4 centerView = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vPushedDepth = 1.0 + (-centerView.z) + uRadius;
        }
      `,
      fragmentShader: `
        #include <logdepthbuf_pars_fragment>
        uniform vec3 uColor;
        uniform vec3 uSunsetColor;
        uniform float uIntensity;
        uniform float uFalloff;
        uniform vec3 uSunDirection;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldNormal;
        varying float vPushedDepth;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);

          // Multi-term falloff: tight inner rim + softer outer glow
          float innerGlow = pow(rim, uFalloff) * uIntensity;
          float outerGlow = pow(rim, uFalloff * 0.45) * uIntensity * 0.3;
          float glow = innerGlow + outerGlow;

          // Sun-direction lighting
          vec3 sunDir = normalize(uSunDirection);
          float NdotL = dot(vWorldNormal, sunDir);
          float sunFactor = smoothstep(-0.15, 0.55, NdotL);

          // Terminator warmth at the day/night boundary
          float terminatorGlow = smoothstep(-0.15, 0.1, NdotL) * smoothstep(0.55, 0.1, NdotL);
          vec3 atmosColor = mix(uColor, uSunsetColor, terminatorGlow);

          // Soft edge to prevent hard cutoff at planet surface
          float softEdge = smoothstep(0.0, 0.12, rim);

          glow *= mix(0.15, 1.0, sunFactor) * softEdge;
          gl_FragColor = vec4(atmosColor * glow, glow);
          #include <logdepthbuf_fragment>
          // Override depth to planet far side so nearby objects occlude atmosphere
          #if defined(USE_LOGDEPTHBUF)
            gl_FragDepth = log2(max(1e-6, vPushedDepth)) * logDepthBufFC * 0.5;
          #endif
        }
      `,
      uniforms: {
        uColor: { value: new THREE.Vector3(...color) },
        uSunsetColor: { value: new THREE.Vector3(...sunsetColor) },
        uIntensity: { value: intensity },
        uFalloff: { value: falloff },
        uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
        uRadius: { value: radius },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });

    super(geometry, material);
    this.renderOrder = 1000;
  }
}
