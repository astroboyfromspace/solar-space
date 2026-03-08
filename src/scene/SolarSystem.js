import * as THREE from 'three';
import { BODIES } from '../data/bodies.js';
import { Sun } from './Sun.js';
import { Planet, resetPlanetIndex } from './Planet.js';
import { Moon, resetMoonIndices } from './Moon.js';
import { Rings } from './Rings.js';
import { OrbitLines } from './OrbitLines.js';

export class SolarSystem extends THREE.Group {
  constructor() {
    super();

    resetPlanetIndex();
    resetMoonIndices();

    this.bodyObjects = new Map();

    // Dim ambient light so dark sides aren't pure black
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
    this.add(this.ambientLight);

    // First pass: create all bodies
    for (const data of BODIES) {
      let obj;

      if (data.type === 'star') {
        obj = new Sun(data);
      } else if (data.type === 'planet') {
        obj = new Planet(data);
      } else if (data.type === 'moon') {
        obj = new Moon(data);
      }

      this.bodyObjects.set(data.name, obj);

      // Add rings if specified (parent to mesh so rings tilt with axial tilt)
      if (data.rings) {
        const rings = new Rings(data.rings.innerRadius, data.rings.outerRadius, data.color, data.rings.texture);
        obj.mesh.add(rings);
      }
    }

    // Second pass: parent moons to their planets, add top-level bodies to scene
    for (const data of BODIES) {
      const obj = this.bodyObjects.get(data.name);

      if (data.type === 'moon' && data.parent) {
        const parentObj = this.bodyObjects.get(data.parent);
        if (parentObj) {
          parentObj.add(obj);
        }
      } else {
        this.add(obj);
      }
    }

    this._orbitLines = new OrbitLines(this);
  }

  toggleOrbitLines() {
    return this._orbitLines.toggle();
  }

  update(simDelta) {
    for (const body of this.bodyObjects.values()) {
      body.update(simDelta);
    }
  }
}
