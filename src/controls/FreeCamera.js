import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class FreeCamera {
  constructor(camera, domElement) {
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 50000;
    this.controls.target.set(0, 0, 0);
    this.focusedBody = null;
  }

  enable() {
    this.controls.enabled = true;
  }

  disable() {
    this.controls.enabled = false;
  }

  setTarget(vec3) {
    this.controls.target.copy(vec3);
  }

  setFocusedBody(body) {
    this.focusedBody = body;
    if (body) {
      body.mesh.getWorldPosition(this.controls.target);
    }
  }

  clearFocus() {
    this.focusedBody = null;
    this.controls.target.set(0, 0, 0);
  }

  update() {
    if (this.focusedBody) {
      this.focusedBody.mesh.getWorldPosition(this.controls.target);
    }
    this.controls.update();
  }
}
