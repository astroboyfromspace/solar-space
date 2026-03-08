import * as THREE from 'three';
import { BODIES } from '../data/bodies.js';

const SEGMENTS = 128;

export class OrbitLines {
  constructor(solarSystem) {
    this._lines = [];
    this._visible = false;

    const material = new THREE.LineBasicMaterial({
      color: 0x444466,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });

    for (const data of BODIES) {
      if (!data.displayOrbitalRadius) continue;

      const radius = data.displayOrbitalRadius;
      const points = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const angle = (i / SEGMENTS) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        ));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      line.visible = false;

      if (data.type === 'moon' && data.parent) {
        const parentBody = solarSystem.bodyObjects.get(data.parent);
        if (parentBody) parentBody.add(line);
      } else {
        solarSystem.add(line);
      }

      this._lines.push(line);
    }
  }

  toggle() {
    this._visible = !this._visible;
    for (const line of this._lines) {
      line.visible = this._visible;
    }
    return this._visible;
  }
}
