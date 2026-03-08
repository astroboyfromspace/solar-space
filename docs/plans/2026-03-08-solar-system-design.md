# Solar System Emulation — Design

## Goal

Observe the movement of planets, sun, and moons from the surface of any celestial body. Not a physics simulation — no gravity, no n-body. Planets follow fixed orbital paths with real period ratios and a configurable time scale.

## Scope

Inner solar system + Jupiter/Saturn:
- Sun
- Mercury, Venus, Earth (+Moon), Mars
- Jupiter (+Galilean moons: Io, Europa, Ganymede, Callisto)
- Saturn (+rings, +Titan)

~15 bodies total.

## Architecture

Vite + Three.js. Single-page app, no framework.

```
solar-system/
├── src/
│   ├── main.js              # Entry point, init scene
│   ├── scene/
│   │   ├── SolarSystem.js   # Top-level orchestrator
│   │   ├── CelestialBody.js # Base class: mesh + orbit params
│   │   ├── Sun.js           # Emissive body + light source
│   │   ├── Planet.js        # Extends CelestialBody
│   │   ├── Moon.js          # Extends CelestialBody, orbits parent
│   │   └── Rings.js         # Saturn rings
│   ├── controls/
│   │   ├── FreeCamera.js    # Fly mode (OrbitControls-based)
│   │   ├── SurfaceCamera.js # Fixed on surface, mouse look
│   │   └── SurfaceWalker.js # WASD walking on sphere (Phase 6)
│   ├── time/
│   │   └── TimeController.js # Time scale, pause, speed
│   ├── ui/
│   │   └── HUD.js           # Time controls, body picker, info
│   └── data/
│       └── bodies.js        # Orbital params, sizes, colors
├── public/
│   └── textures/            # NASA texture maps (Phase 3)
├── index.html
└── package.json
```

### Key Decisions

- **Scene graph hierarchy:** Moons are children of their planet's Object3D group. Moon orbit math is local — rotate around (0,0,0) of parent group. Planet group orbits sun.
- **Scale:** Distances and sizes use separate scale factors. Sizes exaggerated ~50-100x relative to orbit distances so planets are visible.
- **Orbits:** Circular paths (no ellipses). Real period ratios with configurable time multiplier.
- **No gravity/physics:** Bodies follow predefined paths. Surface "gravity" is just camera alignment to surface normal.

## Phases

### Phase 1 — Scene & Static Bodies

- Vite project setup, Three.js installed
- Black background with starfield (particle system or skybox)
- Sun as emissive sphere at origin with PointLight
- All planets as colored spheres at correct relative orbital distances (scaled)
- Moons as smaller spheres parented to their planet groups
- Saturn rings (flat RingGeometry with basic material)
- Free-fly camera (OrbitControls)

**Skills:** threejs-fundamentals, threejs-geometry, threejs-materials, threejs-lighting

**Test:** Fly around, see all bodies at correct relative positions. Sun glows, rings visible.

### Phase 2 — Motion & Time

- Planets orbit sun using real period ratios (angular velocity from orbital period)
- Moons orbit their planets
- Bodies self-rotate (correct axial tilt applied)
- TimeController: play/pause, speed slider (1s = 1hr up to 1s = 1yr)
- HUD showing current time scale and simulated date

**Skills:** threejs-animation

**Test:** Watch Earth orbit, Moon circle Earth. Speed up to see outer planets move. Pause and resume.

### Phase 3 — Textures & Visuals

- NASA diffuse texture maps on all bodies
- Normal/bump maps where available (Moon, Mars, Mercury)
- Earth gets cloud layer (second slightly larger transparent sphere)
- Sun gets emissive texture
- Saturn rings get translucent texture with opacity falloff
- Upgrade materials to MeshStandardMaterial (PBR)

**Skills:** threejs-textures, threejs-materials

**Test:** Everything looks recognizably real. Earth has clouds, Saturn has detailed rings.

### Phase 4 — Lighting & Shadows

- PointLight at sun position casts shadows
- Shadow mapping enabled on planets and moons (renderer.shadowMap)
- Shadow map resolution: start 2048, tune for performance
- Ring shadow on Saturn's surface, Saturn shadow on rings
- Day/night terminator visible on rotating textured planets

**Skills:** threejs-lighting, threejs-shaders (if needed for shadow tuning)

**Test:** Pause time, fly to Earth — see lit side and dark side. Align Moon for shadow.

### Phase 5 — Surface View (Fixed)

- Click a body (raycasting) or pick from HUD dropdown to "land"
- Camera placed on surface at latitude/longitude, aligned to surface normal (up = away from center)
- Mouse look: pitch (clamped +-85 deg) and yaw (360 free)
- Sky rotates as the body rotates — sun, planets, moons traverse the sky
- Toggle key (F) to switch between surface view and free-fly
- Smooth transition animation between modes

**Skills:** threejs-interaction, threejs-fundamentals

**Test:** Stand on Earth, watch Moon rise and set, see Sun cross the sky.

### Phase 6 — Walking on Surface

- WASD moves along the sphere surface in tangent space
- Camera up-vector continuously re-aligned to surface normal
- Movement speed configurable (faster on larger bodies)
- Tangent-space forward/right vectors computed from camera yaw + surface normal

**Skills:** threejs-interaction, threejs-geometry

**Test:** Walk on Moon, see Earth in sky, horizon curves correctly.

### Phase 7 — Polish

- Post-processing bloom on Sun (EffectComposer + UnrealBloomPass)
- Thin atmosphere halo shader on Earth (rim/fresnel glow)
- Orbit path lines (toggleable)
- HUD: current body name, lat/long, nearest visible bodies labeled
- Lens flare or glow when looking at Sun from surface

**Skills:** threejs-postprocessing, threejs-shaders

**Test:** Full experience — land on Mars, walk around, speed up time, watch Phobos zip across sky.

## Three.js Skills Usage Map

| Skill | Phases |
|-------|--------|
| threejs-fundamentals | 1, 5 |
| threejs-geometry | 1, 6 |
| threejs-materials | 1, 3 |
| threejs-lighting | 1, 4 |
| threejs-textures | 3 |
| threejs-animation | 2 |
| threejs-interaction | 5, 6 |
| threejs-shaders | 4, 7 |
| threejs-postprocessing | 7 |
| threejs-loaders | 3 |
