import * as THREE from 'three';
import { Rings } from './Rings.js';

const MAX_OCCLUDERS = 5;

const SHADOW_VERTEX = /* glsl */`
varying vec3 vShadowWorldPos;
`;

const SHADOW_VERTEX_MAIN = /* glsl */`
vShadowWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const SHADOW_FRAGMENT_HEADER = /* glsl */`
varying vec3 vShadowWorldPos;
uniform vec3 uSunPos;
uniform float uSunRadius;
uniform vec3 uOccPos[${MAX_OCCLUDERS}];
uniform float uOccRadius[${MAX_OCCLUDERS}];
uniform int uOccCount;

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
`;

const SHADOW_FRAGMENT_MAIN = /* glsl */`
{
    float rayShadow = 1.0;
    for (int i = 0; i < ${MAX_OCCLUDERS}; i++) {
        if (i >= uOccCount) break;
        rayShadow *= shadowOcclusion(vShadowWorldPos, uSunPos, uSunRadius, uOccPos[i], uOccRadius[i]);
    }
    reflectedLight.directDiffuse *= rayShadow;
    reflectedLight.directSpecular *= rayShadow;
}
`;

function applyRaycastShadow(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunPos = { value: new THREE.Vector3() };
    shader.uniforms.uSunRadius = { value: 0 };
    shader.uniforms.uOccCount = { value: 0 };
    shader.uniforms.uOccPos = { value: Array.from({ length: MAX_OCCLUDERS }, () => new THREE.Vector3()) };
    shader.uniforms.uOccRadius = { value: new Array(MAX_OCCLUDERS).fill(0) };

    material.userData.shadowShader = shader;

    shader.vertexShader = SHADOW_VERTEX + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n' + SHADOW_VERTEX_MAIN
    );

    shader.fragmentShader = SHADOW_FRAGMENT_HEADER + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      '#include <lights_fragment_end>\n' + SHADOW_FRAGMENT_MAIN
    );
  };

  material.customProgramCacheKey = () => 'raycast-shadow';
}

const SHADOW_CONFIG = [
  // Moons cast shadows on planets
  { receiver: 'Earth',   occluders: ['Moon'] },
  { receiver: 'Mars',    occluders: ['Phobos', 'Deimos'] },
  { receiver: 'Jupiter', occluders: ['Io', 'Europa', 'Ganymede', 'Callisto'] },
  { receiver: 'Saturn',  occluders: ['Titan', 'Rhea', 'Dione', 'Tethys', 'Iapetus'] },
  { receiver: 'Uranus',  occluders: ['Titania', 'Oberon', 'Umbriel', 'Ariel', 'Miranda'] },
  { receiver: 'Neptune', occluders: ['Triton'] },
  // Planets cast shadows on moons + moons shadow each other
  { receiver: 'Moon',      occluders: ['Earth'] },
  { receiver: 'Phobos',   occluders: ['Mars'] },
  { receiver: 'Deimos',   occluders: ['Mars'] },
  { receiver: 'Io',       occluders: ['Jupiter', 'Europa', 'Ganymede', 'Callisto'] },
  { receiver: 'Europa',   occluders: ['Jupiter', 'Io', 'Ganymede', 'Callisto'] },
  { receiver: 'Ganymede', occluders: ['Jupiter', 'Io', 'Europa', 'Callisto'] },
  { receiver: 'Callisto', occluders: ['Jupiter', 'Io', 'Europa', 'Ganymede'] },
  { receiver: 'Mimas',     occluders: ['Saturn'] },
  { receiver: 'Enceladus', occluders: ['Saturn'] },
  { receiver: 'Tethys',    occluders: ['Saturn'] },
  { receiver: 'Dione',     occluders: ['Saturn'] },
  { receiver: 'Rhea',      occluders: ['Saturn'] },
  { receiver: 'Titan',     occluders: ['Saturn'] },
  { receiver: 'Iapetus',   occluders: ['Saturn'] },
  { receiver: 'Miranda',  occluders: ['Uranus'] },
  { receiver: 'Ariel',    occluders: ['Uranus'] },
  { receiver: 'Umbriel',  occluders: ['Uranus'] },
  { receiver: 'Titania',  occluders: ['Uranus'] },
  { receiver: 'Oberon',   occluders: ['Uranus'] },
  { receiver: 'Triton',   occluders: ['Neptune'] },
];

const _pos = new THREE.Vector3();

export class RaycastShadows {
  constructor(bodyObjects) {
    this._bodyObjects = bodyObjects;
    this._entries = [];

    for (const { receiver, occluders } of SHADOW_CONFIG) {
      const planet = bodyObjects.get(receiver);
      if (!planet) continue;

      // Main mesh material
      this._applyAndTrack(planet.mesh.material, occluders);

      // Cloud material (Earth)
      if (planet.cloudMesh) {
        this._applyAndTrack(planet.cloudMesh.material, occluders);
      }

      // Ring material (Saturn) — Rings are children of mesh
      planet.mesh.children.forEach(child => {
        if (child instanceof Rings) {
          this._applyAndTrack(child.material, occluders);
        }
      });
    }
  }

  _applyAndTrack(material, occluderNames) {
    applyRaycastShadow(material);
    this._entries.push({ material, occluderNames });
  }

  update() {
    const sun = this._bodyObjects.get('Sun');
    sun.getWorldPosition(_pos);
    const sunX = _pos.x, sunY = _pos.y, sunZ = _pos.z;
    const sunRadius = sun.bodyData.displayRadius;

    for (const { material, occluderNames } of this._entries) {
      const shader = material.userData.shadowShader;
      if (!shader) continue;

      shader.uniforms.uSunPos.value.set(sunX, sunY, sunZ);
      shader.uniforms.uSunRadius.value = sunRadius;
      shader.uniforms.uOccCount.value = occluderNames.length;

      for (let i = 0; i < occluderNames.length; i++) {
        const occ = this._bodyObjects.get(occluderNames[i]);
        occ.getWorldPosition(shader.uniforms.uOccPos.value[i]);
        shader.uniforms.uOccRadius.value[i] = occ.bodyData.displayRadius;
      }
    }
  }
}
