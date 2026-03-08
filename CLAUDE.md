# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive 3D Solar System visualization built with **Vite + Three.js**. Pure vanilla JS (no framework), ES modules throughout.

## Commands

- `npm run dev` — Start Vite dev server (auto-opens browser)
- `npm run build` — Production build to `/dist`
- `npm run preview` — Preview production build

No test framework is configured.

## Architecture

### Entry Point & Render Loop

`src/main.js` initializes the WebGL renderer, scene, camera, and orchestrates the animation loop:
1. Update time simulation (TimeController scales real time → sim time)
2. Update all celestial bodies (SolarSystem)
3. Update camera (CameraManager dispatches to active mode)
4. Render via EffectComposer (bloom post-processing)

### Scene Graph

```
CelestialBody (base class — orbit + rotation logic)
├── Sun         — emissive material, PointLight, lens flare
├── Planet      — PBR material, optional atmosphere/clouds/rings
└── Moon        — orbits parent planet in local space
```

- `SolarSystem.js` is the top-level orchestrator that creates all 15 bodies from `data/bodies.js`
- Moons are children of their planet's Object3D group (orbits computed in parent-local space)
- Rings are children of planet meshes (inherit axial tilt)

### Camera System

`CameraManager` switches between three modes:
- **FreeCamera** — OrbitControls for orbital viewing; click a body to land
- **SurfaceCamera** — FPS-style with pointer lock, WASD walking, shift-to-run
- **Transition** — smooth 1.5s interpolation between modes

### Key Technical Details

- **Renderer:** WebGL, SRGB color space, PCFSoftShadowMap
- **Lighting:** Single PointLight at Sun (decay=0 so distant planets stay lit)
- **Post-processing:** UnrealBloomPass (strength 0.8, radius 0.4, threshold 0.85)
- **Time model:** Real orbital periods (scaled); J2000 epoch reference; configurable 1s=1hr to 1s=1yr
- **UI:** Vanilla HTML/CSS overlay (HUD.js), no DOM framework
- **Textures:** NASA maps loaded via TextureManager with progress tracking
