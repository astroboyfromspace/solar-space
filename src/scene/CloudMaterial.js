import * as THREE from 'three';

const MAX_OCCLUDERS = 5;

const vertexShader = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;
    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */`
  #include <logdepthbuf_pars_fragment>

  uniform sampler2D uCloudMap;
  uniform vec3 uSunDirection;

  uniform float uScatterPower;
  uniform float uScatterStrength;
  uniform vec3 uSunsetColor;

  uniform vec3 uSunPos;
  uniform float uSunRadius;
  uniform vec3 uOccPos[${MAX_OCCLUDERS}];
  uniform float uOccRadius[${MAX_OCCLUDERS}];
  uniform int uOccCount;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  float shadowOcclusion(vec3 P, vec3 sunC, float sunR, vec3 occC, float occR) {
    vec3 toSun = sunC - P;
    float dSun = length(toSun);
    vec3 L = toSun / dSun;
    vec3 toOcc = occC - P;
    float projDist = dot(toOcc, L);
    if (projDist < 0.0) return 1.0;
    float dOcc = length(toOcc);
    if (dOcc > dSun) return 1.0;
    float angSun = sunR / dSun;
    float angOcc = occR / dOcc;
    float angSep = length(toOcc - L * projDist) / dOcc;
    if (angSep >= angSun + angOcc) return 1.0;
    if (angSep + angSun <= angOcc) return 0.0;
    float t = smoothstep(angSun + angOcc, abs(angSun - angOcc), angSep);
    float maxBlock = min(1.0, (angOcc * angOcc) / (angSun * angSun));
    return 1.0 - t * maxBlock;
  }

  void main() {
    float cloudAlpha = texture2D(uCloudMap, vUv).r;

    // Alpha remapping: wispy areas vanish, thick clouds fully opaque
    cloudAlpha = smoothstep(0.05, 0.7, cloudAlpha);
    if (cloudAlpha < 0.01) discard;

    vec3 N = normalize(vWorldNormal);
    vec3 sunDir = normalize(uSunDirection);
    float NdotL = dot(N, sunDir);

    // Smooth day/night terminator
    float dayFactor = smoothstep(-0.1, 0.2, NdotL);

    // Eclipse shadow
    float rayShadow = 1.0;
    for (int i = 0; i < ${MAX_OCCLUDERS}; i++) {
      if (i >= uOccCount) break;
      rayShadow *= shadowOcclusion(vWorldPosition, uSunPos, uSunRadius, uOccPos[i], uOccRadius[i]);
    }

    // Sun-aware diffuse lighting
    float diffuse = dayFactor * rayShadow;
    float ambient = 0.06;
    vec3 color = vec3(diffuse + ambient * (1.0 - dayFactor));

    // Forward scattering: thin cloud edges glow when looking toward sun
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float scatter = pow(max(dot(viewDir, -sunDir), 0.0), uScatterPower) * uScatterStrength;
    scatter *= cloudAlpha * (1.0 - cloudAlpha * 0.5) * dayFactor;
    color += vec3(scatter);

    // Terminator warm tinting: bell-shaped band at NdotL ≈ 0.05
    float sunsetBand = exp(-pow((NdotL - 0.05) / 0.12, 2.0));
    color = mix(color, uSunsetColor * (diffuse + ambient), sunsetBand * 0.7 * rayShadow);

    // Night-side fade: clouds mostly disappear so they don't block stars
    float alpha = cloudAlpha * max(dayFactor, 0.08);

    gl_FragColor = vec4(color, alpha);
    #include <logdepthbuf_fragment>
  }
`;

export function createCloudMaterial(cloudTexture) {
  const uniforms = {
    uCloudMap: { value: cloudTexture },
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },

    uScatterPower: { value: 3.0 },
    uScatterStrength: { value: 0.6 },
    uSunsetColor: { value: new THREE.Vector3(1.0, 0.6, 0.2) },

    // Raycast shadow uniforms
    uSunPos: { value: new THREE.Vector3() },
    uSunRadius: { value: 0 },
    uOccPos: { value: Array.from({ length: MAX_OCCLUDERS }, () => new THREE.Vector3()) },
    uOccRadius: { value: new Array(MAX_OCCLUDERS).fill(0) },
    uOccCount: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
  });

  // Pre-set shadowShader so RaycastShadows.update() can find our uniforms
  material.userData.shadowShader = { uniforms };

  return material;
}
