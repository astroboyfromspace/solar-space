import * as THREE from 'three';
import { FreeCamera } from './FreeCamera.js';
import { SurfaceCamera, surfaceLocalPosition } from './SurfaceCamera.js';

const CLICK_THRESHOLD_PX = 3;
const TRANSITION_DURATION = 1.5;
const PULLBACK_RADII = 5;
const NEAR_SURFACE = 0.001;
const NEAR_DEFAULT = 0.1;

export class CameraManager {
  constructor(camera, domElement, solarSystem) {
    this.camera = camera;
    this.domElement = domElement;
    this.solarSystem = solarSystem;

    this.freeCamera = new FreeCamera(camera, domElement);
    this.surfaceCamera = new SurfaceCamera(camera, domElement);

    this.mode = 'freefly'; // 'freefly' | 'surface' | 'transition'
    this.onModeChange = null; // callback for HUD
    this._surfaceInfo = { latitude: 0, longitude: 0 };

    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._pointerStart = new THREE.Vector2();
    this._pointerDown = false;

    // Pre-allocated temporaries
    this._tmpVec = new THREE.Vector3();
    this._tmpVec2 = new THREE.Vector3();
    this._lookAtObj = new THREE.Object3D();
    this._tmpLocalPos = new THREE.Vector3();

    this._onPointerDown = (e) => {
      if (this.mode !== 'freefly') return;
      this._pointerDown = true;
      this._pointerStart.set(e.clientX, e.clientY);
    };
    domElement.addEventListener('pointerdown', this._onPointerDown);

    this._onPointerUp = (e) => {
      if (!this._pointerDown || this.mode !== 'freefly') {
        this._pointerDown = false;
        return;
      }
      this._pointerDown = false;
      const dx = e.clientX - this._pointerStart.x;
      const dy = e.clientY - this._pointerStart.y;
      if (Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD_PX) {
        this._handleClick(e);
      }
    };
    domElement.addEventListener('pointerup', this._onPointerUp);

    // F key to return to freefly
    this._onKeyDown = (e) => {
      if (e.code === 'KeyF' && this.mode === 'surface') {
        this.transitionToFreefly();
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    // Transition state
    this._transition = null;
  }

  _lookAtQuaternion(fromPos, targetPos) {
    this._lookAtObj.position.copy(fromPos);
    this._lookAtObj.lookAt(targetPos);
    return this._lookAtObj.quaternion;
  }

  _handleClick(e) {
    const rect = this.domElement.getBoundingClientRect();
    this._mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.raycaster.setFromCamera(this._mouse, this.camera);

    // Collect all body meshes
    const meshes = [];
    for (const body of this.solarSystem.bodyObjects.values()) {
      if (body.mesh) meshes.push(body.mesh);
    }

    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return;

    const hit = hits[0];
    const mesh = hit.object;

    // Find the body that owns this mesh
    let targetBody = null;
    for (const body of this.solarSystem.bodyObjects.values()) {
      if (body.mesh === mesh) {
        targetBody = body;
        break;
      }
    }
    if (!targetBody) return;

    // Convert hit point to mesh-local space
    const localPoint = mesh.worldToLocal(hit.point.clone());
    const r = targetBody.bodyData.displayRadius;
    const lat = Math.asin(THREE.MathUtils.clamp(localPoint.y / r, -1, 1));
    const lon = Math.atan2(localPoint.x, localPoint.z);

    this.transitionToSurface(targetBody, lat, lon);
  }

  transitionToSurface(body, lat, lon) {
    this.freeCamera.disable();
    const startPos = this.camera.position.clone();
    const startQuat = this.camera.quaternion.clone();

    this.mode = 'transition';
    this._transition = {
      direction: 'toSurface',
      body,
      lat,
      lon,
      startPos,
      startQuat,
      elapsed: 0,
      duration: TRANSITION_DURATION,
    };
  }

  transitionToFreefly() {
    const result = this.surfaceCamera.detach();
    if (!result) return;

    const startPos = result.position.clone();
    const startQuat = result.quaternion.clone();

    // Compute end position: pull back along surface normal
    const bodyWorldPos = this._tmpVec;
    result.body.mesh.getWorldPosition(bodyWorldPos);
    const normal = this._tmpVec2.copy(startPos).sub(bodyWorldPos).normalize();
    const pullback = result.body.bodyData.displayRadius * PULLBACK_RADII;
    const endPos = startPos.clone().add(normal.clone().multiplyScalar(pullback));

    // End quaternion: look at body center
    const endQuat = this._lookAtQuaternion(endPos, bodyWorldPos).clone();

    // Set OrbitControls target to body world position
    this.freeCamera.setTarget(bodyWorldPos);

    this.mode = 'transition';
    this._transition = {
      direction: 'toFreefly',
      startPos,
      startQuat,
      endPos,
      endQuat,
      elapsed: 0,
      duration: TRANSITION_DURATION,
    };
  }

  _activateSurfaceMode(body, lat, lon) {
    this.mode = 'surface';
    this.camera.near = NEAR_SURFACE;
    this.camera.updateProjectionMatrix();
    this.surfaceCamera.land(body, lat, lon);
    if (this.onModeChange) this.onModeChange('surface', body.bodyData.name);
  }

  _activateFreeflyMode() {
    this.mode = 'freefly';
    this.camera.near = NEAR_DEFAULT;
    this.camera.updateProjectionMatrix();
    this.freeCamera.enable();
    if (this.onModeChange) this.onModeChange('freefly');
  }

  getSurfaceInfo() {
    if (this.mode !== 'surface' || !this.surfaceCamera.active) return null;
    this._surfaceInfo.latitude = this.surfaceCamera.latitude;
    this._surfaceInfo.longitude = this.surfaceCamera.longitude;
    return this._surfaceInfo;
  }

  /** Yield { name, body } for each body except the one the camera is on. */
  *iterBodies() {
    const exclude = this.mode === 'surface' ? this.surfaceCamera.body : null;
    for (const [name, body] of this.solarSystem.bodyObjects) {
      if (body !== exclude) yield { name, body };
    }
  }

  landOnBody(name) {
    const body = this.solarSystem.bodyObjects.get(name);
    if (!body) return;

    if (this.mode === 'surface') {
      // Detach from current body first
      this.surfaceCamera.detach();
    }

    this.transitionToSurface(body, 0, 0);
  }

  update(delta) {
    if (this.mode === 'freefly') {
      this.freeCamera.update();
    } else if (this.mode === 'surface') {
      this.surfaceCamera.update(delta);
    } else if (this.mode === 'transition') {
      this._updateTransition(delta);
    }
  }

  _updateTransition(delta) {
    const t = this._transition;
    t.elapsed += delta;
    const raw = THREE.MathUtils.clamp(t.elapsed / t.duration, 0, 1);
    const alpha = THREE.MathUtils.smoothstep(raw, 0, 1);

    if (t.direction === 'toSurface') {
      // Recompute end position each frame (body is moving)
      surfaceLocalPosition(this._tmpLocalPos, t.body, t.lat, t.lon);
      const endPos = this._tmpVec.copy(this._tmpLocalPos).applyMatrix4(t.body.mesh.matrixWorld);

      // End quaternion: look at body center
      const bodyWorldPos = this._tmpVec2;
      t.body.mesh.getWorldPosition(bodyWorldPos);
      const endQuat = this._lookAtQuaternion(endPos, bodyWorldPos);

      this.camera.position.lerpVectors(t.startPos, endPos, alpha);
      this.camera.quaternion.slerpQuaternions(t.startQuat, endQuat, alpha);
    } else {
      // toFreefly: both endpoints fixed
      this.camera.position.lerpVectors(t.startPos, t.endPos, alpha);
      this.camera.quaternion.slerpQuaternions(t.startQuat, t.endQuat, alpha);
    }

    if (t.elapsed >= t.duration) {
      this._transition = null;
      if (t.direction === 'toSurface') {
        this._activateSurfaceMode(t.body, t.lat, t.lon);
      } else {
        this._activateFreeflyMode();
      }
    }
  }
}
