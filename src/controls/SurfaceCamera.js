import * as THREE from 'three';

const SURFACE_HOVER = 0.02;
const MOUSE_SENSITIVITY = 0.002;
const MAX_PITCH = 85 * THREE.MathUtils.DEG2RAD;

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

  land(body, lat, lon) {
    this.body = body;
    this.latitude = lat;
    this.longitude = lon;
    this.yaw = 0;
    this.pitch = 0;
    this.active = true;

    // Parent camera to body mesh
    body.mesh.add(this.camera);

    // Request pointer lock
    this.domElement.requestPointerLock();

    this.update();
  }

  update() {
    if (!this.active || !this.body) return;

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

    return { position, quaternion, body };
  }
}
