import * as THREE from 'three';

const SURFACE_HOVER = 0.02;
const MOUSE_SENSITIVITY = 0.002;
const MAX_PITCH = 85 * THREE.MathUtils.DEG2RAD;
const BASE_WALK_SPEED = 0.15;
const RUN_MULTIPLIER = 3;
const MAX_LATITUDE = 89.5 * THREE.MathUtils.DEG2RAD;

/** Compute mesh-local surface position from lat/lon (radians). */
export function surfaceLocalPosition(out, body, lat, lon) {
  const R = body.bodyData.displayRadius + SURFACE_HOVER;
  const cosLat = Math.cos(lat);
  out.set(
    R * cosLat * Math.sin(lon),
    R * Math.sin(lat),
    R * cosLat * Math.cos(lon),
  );
  return out;
}

export class SurfaceCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.body = null;
    this.latitude = 0;
    this.longitude = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.active = false;
    this._pointerLocked = false;

    // Pre-allocated temporaries for update()
    this._up = new THREE.Vector3();
    this._east = new THREE.Vector3();
    this._north = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._lookDir = new THREE.Vector3();
    this._cameraUp = new THREE.Vector3();
    this._negLook = new THREE.Vector3();
    this._qYaw = new THREE.Quaternion();
    this._qPitch = new THREE.Quaternion();
    this._mat4 = new THREE.Matrix4();
    this._surfacePos = new THREE.Vector3();

    // Key state for WASD walking
    this._keys = { w: false, a: false, s: false, d: false, shift: false };

    this._onKeyDown = (e) => {
      if (!this.active) return;
      this._setKey(e.code, true);
    };

    this._onKeyUp = (e) => {
      this._setKey(e.code, false);
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Pointer lock events
    document.addEventListener('pointerlockchange', () => {
      this._pointerLocked = document.pointerLockElement === this.domElement;
    });

    this._onMouseMove = (e) => {
      if (!this.active || !this._pointerLocked) return;
      this.yaw += e.movementX * MOUSE_SENSITIVITY;
      this.pitch -= e.movementY * MOUSE_SENSITIVITY;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -MAX_PITCH, MAX_PITCH);
    };
    document.addEventListener('mousemove', this._onMouseMove);

    this._onCanvasClick = () => {
      if (this.active && !this._pointerLocked) {
        this.domElement.requestPointerLock();
      }
    };
    this.domElement.addEventListener('click', this._onCanvasClick);
  }

  _setKey(code, value) {
    switch (code) {
      case 'KeyW': this._keys.w = value; break;
      case 'KeyA': this._keys.a = value; break;
      case 'KeyS': this._keys.s = value; break;
      case 'KeyD': this._keys.d = value; break;
      case 'ShiftLeft':
      case 'ShiftRight': this._keys.shift = value; break;
    }
  }

  _resetKeys() {
    this._keys.w = this._keys.a = this._keys.s = this._keys.d = this._keys.shift = false;
  }

  land(body, lat, lon) {
    this.body = body;
    this.latitude = lat;
    this.longitude = lon;
    this.yaw = 0;
    this.pitch = 0;
    this.active = true;
    this._resetKeys();

    // Parent camera to body mesh
    body.mesh.add(this.camera);

    // Request pointer lock
    this.domElement.requestPointerLock();

    this.update();
  }

  update(delta) {
    if (!this.active || !this.body) return;

    // WASD walking — update lat/lon before tangent frame computation
    if (delta > 0) {
      const moveForward = (this._keys.w ? 1 : 0) - (this._keys.s ? 1 : 0);
      const moveRight = (this._keys.d ? 1 : 0) - (this._keys.a ? 1 : 0);

      if (moveForward !== 0 || moveRight !== 0) {
        let speed = BASE_WALK_SPEED;
        if (this._keys.shift) speed *= RUN_MULTIPLIER;

        const cosYaw = Math.cos(this.yaw);
        const sinYaw = Math.sin(this.yaw);
        const northStep = moveForward * cosYaw - moveRight * sinYaw;
        const eastStep = moveForward * sinYaw + moveRight * cosYaw;

        // Normalize diagonal movement so diagonal speed equals cardinal speed
        const len = Math.sqrt(moveForward * moveForward + moveRight * moveRight);
        const step = speed * delta / len;

        this.latitude += step * northStep;
        this.latitude = THREE.MathUtils.clamp(this.latitude, -MAX_LATITUDE, MAX_LATITUDE);
        this.longitude += step * eastStep / Math.cos(this.latitude);
      }
    }

    const lat = this.latitude;
    const lon = this.longitude;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const cosLon = Math.cos(lon);
    const sinLon = Math.sin(lon);

    // Surface position in mesh-local coords
    surfaceLocalPosition(this._surfacePos, this.body, lat, lon);
    this.camera.position.copy(this._surfacePos);

    // Surface normal (up)
    const up = this._up.set(cosLat * sinLon, sinLat, cosLat * cosLon).normalize();

    // East tangent
    const east = Math.abs(cosLat) < 0.001
      ? this._east.set(1, 0, 0)
      : this._east.set(cosLon, 0, -sinLon).normalize();

    // North tangent = up x east
    const north = this._north.crossVectors(up, east).normalize();

    // Apply yaw (rotate around up)
    this._qYaw.setFromAxisAngle(up, -this.yaw);
    const right = this._right.copy(east).applyQuaternion(this._qYaw);
    const forward = this._forward.copy(north).applyQuaternion(this._qYaw);

    // Apply pitch (rotate around right)
    this._qPitch.setFromAxisAngle(right, this.pitch);
    const lookDir = this._lookDir.copy(forward).applyQuaternion(this._qPitch);
    const cameraUp = this._cameraUp.copy(up).applyQuaternion(this._qPitch);

    // Build camera orientation
    const negLook = this._negLook.copy(lookDir).negate();
    this._mat4.makeBasis(right, cameraUp, negLook);
    this.camera.quaternion.setFromRotationMatrix(this._mat4);
  }

  detach() {
    if (!this.active) return null;

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    this.camera.getWorldPosition(position);
    this.camera.getWorldQuaternion(quaternion);

    const body = this.body;

    // Remove camera from mesh
    this.body.mesh.remove(this.camera);
    this.camera.position.copy(position);
    this.camera.quaternion.copy(quaternion);

    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    this.active = false;
    this.body = null;
    this._resetKeys();

    return { position, quaternion, body };
  }
}
