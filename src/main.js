import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CameraManager } from './controls/CameraManager.js';
import { SolarSystem } from './scene/SolarSystem.js';
import { Starfield } from './scene/Starfield.js';
import { TimeController } from './time/TimeController.js';
import { HUD } from './ui/HUD.js';
import { LoadingOverlay } from './ui/LoadingOverlay.js';

// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100000,
);
camera.position.set(0, 80, 200);

// Solar system
const solarSystem = new SolarSystem();
scene.add(solarSystem);

// Controls
const cameraManager = new CameraManager(camera, renderer.domElement, solarSystem);

// Starfield
const starfield = new Starfield();
scene.add(starfield);

// Time controller
const timeController = new TimeController();

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85,
));
composer.addPass(new OutputPass());

// HUD
const hud = new HUD(timeController, cameraManager);
hud.onBodySelected = (name) => cameraManager.landOnBody(name);
cameraManager.onModeChange = (mode, bodyName) => hud.setMode(mode, bodyName);

// Orbit lines toggle
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyO' && e.target === document.body) {
    solarSystem.toggleOrbitLines();
  }
});

// Loading overlay
new LoadingOverlay();

// Clock
const clock = new THREE.Clock();

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const simDelta = timeController.update(delta);
  solarSystem.update(simDelta);
  hud.update();
  cameraManager.update(delta);
  composer.render(delta);
}
animate();
