import * as THREE from 'three';
import { loadTexture } from '../loaders/TextureManager.js';

const MAX_OCCLUDERS = 5;

const vertexShader = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */`
  #include <logdepthbuf_pars_fragment>

  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uSpecularMap;
  uniform sampler2D uCloudMap;

  uniform vec3 uSunDirection;
  uniform vec2 uCloudShadowOffset;

  uniform vec3 uFresnelColor;
  uniform float uFresnelPower;
  uniform float uFresnelStrength;

  uniform float uSpecularStrength;
  uniform float uSpecularPower;

  uniform float uNightIntensity;

  uniform vec3 uSunPos;
  uniform float uSunRadius;
  uniform vec3 uOccPos[${MAX_OCCLUDERS}];
  uniform float uOccRadius[${MAX_OCCLUDERS}];
  uniform int uOccCount;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

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

  vec3 perturbNormal(vec3 N, vec3 pos, vec2 uv) {
    vec3 ns = texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
    vec3 dp1 = dFdx(pos);
    vec3 dp2 = dFdy(pos);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);
    vec3 dp2perp = cross(dp2, N);
    vec3 dp1perp = cross(N, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
    float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
    mat3 TBN = mat3(T * invmax, B * invmax, N);
    return normalize(TBN * ns);
  }

  void main() {
    vec4 dayColor = texture2D(uDayMap, vUv);
    vec4 nightColor = texture2D(uNightMap, vUv);
    float specularMask = texture2D(uSpecularMap, vUv).r;

    vec3 N = normalize(vWorldNormal);
    N = perturbNormal(N, vWorldPosition, vUv);

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

    // Cloud shadow on surface
    vec2 cloudUV = vUv + uCloudShadowOffset;
    float cloudAlpha = texture2D(uCloudMap, cloudUV).r;
    float cloudShadow = 1.0 - cloudAlpha * 0.4 * dayFactor;

    // Day lighting
    float diffuse = max(NdotL, 0.0) * rayShadow;
    vec3 litDay = dayColor.rgb * diffuse * cloudShadow;

    // Night city lights
    float nightFactor = 1.0 - dayFactor;
    vec3 litNight = nightColor.rgb * uNightIntensity * nightFactor * (1.0 - cloudAlpha * 0.6);
    // Eclipse also darkens night lights (realistic — no sunlight reflected from atmosphere)
    litNight *= mix(1.0, 0.3, 1.0 - rayShadow);

    vec3 color = litDay * dayFactor + litNight;

    // Ocean specular (Blinn-Phong)
    vec3 viewDirWorld = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(sunDir + viewDirWorld);
    float spec = pow(max(dot(N, halfDir), 0.0), uSpecularPower);
    spec *= specularMask * uSpecularStrength * dayFactor * rayShadow;
    color += vec3(spec);

    // Fresnel rim
    float fresnel = pow(1.0 - max(dot(viewDirWorld, N), 0.0), uFresnelPower);
    fresnel *= uFresnelStrength;
    float fresnelSunFactor = smoothstep(-0.3, 0.5, NdotL);
    color += uFresnelColor * fresnel * fresnelSunFactor * rayShadow;

    gl_FragColor = vec4(color, 1.0);
    #include <logdepthbuf_fragment>
    #include <colorspace_fragment>
  }
`;

export function createEarthMaterial(bodyData) {
  const uniforms = {
    uDayMap: { value: loadTexture(bodyData.textures.map) },
    uNightMap: { value: loadTexture(bodyData.textures.nightMap) },
    uNormalMap: { value: loadTexture(bodyData.textures.normalMap, false) },
    uSpecularMap: { value: loadTexture(bodyData.textures.specularMap, false) },
    uCloudMap: { value: null },

    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
    uCloudShadowOffset: { value: new THREE.Vector2(0, 0) },

    uFresnelColor: { value: new THREE.Vector3(0.4, 0.7, 1.0) },
    uFresnelPower: { value: 3.0 },
    uFresnelStrength: { value: 0.25 },

    uSpecularStrength: { value: 0.8 },
    uSpecularPower: { value: 32.0 },

    uNightIntensity: { value: 1.5 },

    // Raycast shadow uniforms (matching RaycastShadows.js)
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
    stencilWrite: true,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilRef: 1,
    stencilZPass: THREE.ReplaceStencilOp,
  });

  // Pre-set shadowShader so RaycastShadows.update() can find our uniforms
  material.userData.shadowShader = { uniforms };

  return material;
}
