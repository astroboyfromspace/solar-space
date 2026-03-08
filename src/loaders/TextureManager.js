import * as THREE from 'three';

const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);

const progressCallbacks = [];
const completeCallbacks = [];

manager.onProgress = (url, loaded, total) => {
  const progress = total > 0 ? loaded / total : 0;
  for (const cb of progressCallbacks) cb(progress, loaded, total);
};

manager.onLoad = () => {
  for (const cb of completeCallbacks) cb();
};

/**
 * Load a texture with correct color space.
 * @param {string} path - Path relative to public root (e.g. 'textures/earth_day.jpg')
 * @param {boolean} isSRGB - true for diffuse/color maps, false for normal/bump maps
 * @returns {THREE.Texture}
 */
export function loadTexture(path, isSRGB = true) {
  const texture = loader.load(path);
  if (isSRGB) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  return texture;
}

/**
 * Apply texture options from bodyData onto a material options object.
 * Loads map, normalMap, bumpMap if present; sets color to white when textured.
 */
export function applyTextureOpts(matOpts, bodyData) {
  if (bodyData.textures?.map) {
    matOpts.map = loadTexture(bodyData.textures.map);
    matOpts.color = 0xffffff;
  } else {
    matOpts.color = bodyData.color;
  }
  if (bodyData.textures?.normalMap) {
    matOpts.normalMap = loadTexture(bodyData.textures.normalMap, false);
  }
  if (bodyData.textures?.bumpMap) {
    matOpts.bumpMap = loadTexture(bodyData.textures.bumpMap, false);
  }
  return matOpts;
}

/**
 * Register a callback for loading progress updates.
 * @param {(progress: number, loaded: number, total: number) => void} callback
 */
export function onLoadingProgress(callback) {
  progressCallbacks.push(callback);
}

/**
 * Register a callback for when all textures finish loading.
 * @param {() => void} callback
 */
export function onLoadingComplete(callback) {
  completeCallbacks.push(callback);
}
