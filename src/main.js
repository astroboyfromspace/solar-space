import * as THREE from 'three';
import { FreeCamera } from './controls/FreeCamera.js';
import { SolarSystem } from './scene/SolarSystem.js';
import { Starfield } from './scene/Starfield.js';
import { HUD } from './ui/HUD.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
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

// Controls
const freeCamera = new FreeCamera(camera, renderer.domElement);

// Solar system
const solarSystem = new SolarSystem();
scene.add(solarSystem);

// Starfield
const starfield = new Starfield();
scene.add(starfield);

// HUD
const hud = new HUD();

// Clock
const clock = new THREE.Clock();

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  freeCamera.update();
  renderer.render(scene, camera);
}
animate();
