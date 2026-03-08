// Scale: 1 AU = 100 units
// Sizes exaggerated so planets are visible
// Moon orbital radii exaggerated to 5-15 units from parent

export const BODIES = [
  // Sun
  {
    name: 'Sun',
    type: 'star',
    displayRadius: 12,
    displayOrbitalRadius: 0,
    orbitalPeriod: 0,       // days (doesn't orbit)
    rotationPeriod: 25.38,  // days
    axialTilt: 7.25,        // degrees
    color: 0xffdd44,
    parent: null,
    textures: { map: 'textures/sun.jpg' },
  },

  // Inner planets
  {
    name: 'Mercury',
    type: 'planet',
    displayRadius: 0.6,
    displayOrbitalRadius: 38.7,   // 0.387 AU
    orbitalPeriod: 87.97,
    rotationPeriod: 58.65,
    axialTilt: 0.034,
    color: 0xaaaaaa,
    parent: null,
    textures: { map: 'textures/mercury.jpg' },
  },
  {
    name: 'Venus',
    type: 'planet',
    displayRadius: 1.2,
    displayOrbitalRadius: 72.3,   // 0.723 AU
    orbitalPeriod: 224.7,
    rotationPeriod: -243.02,      // negative = retrograde
    axialTilt: 177.4,
    color: 0xe8cda0,
    parent: null,
    textures: { map: 'textures/venus_atmosphere.jpg' },
  },
  {
    name: 'Earth',
    type: 'planet',
    displayRadius: 1.5,
    displayOrbitalRadius: 100,    // 1.0 AU
    orbitalPeriod: 365.25,
    rotationPeriod: 1.0,
    axialTilt: 23.44,
    color: 0x4488ff,
    parent: null,
    textures: {
      map: 'textures/earth_day.jpg',
      normalMap: 'textures/earth_normal.jpg',
      clouds: 'textures/earth_clouds.jpg',
    },
    atmosphere: { color: [0.3, 0.6, 1.0], intensity: 0.6, falloff: 5.0 },
  },
  {
    name: 'Mars',
    type: 'planet',
    displayRadius: 0.9,
    displayOrbitalRadius: 152.4,  // 1.524 AU
    orbitalPeriod: 687.0,
    rotationPeriod: 1.026,
    axialTilt: 25.19,
    color: 0xcc6644,
    parent: null,
    textures: { map: 'textures/mars.jpg' },
  },

  // Outer planets
  {
    name: 'Jupiter',
    type: 'planet',
    displayRadius: 5.0,
    displayOrbitalRadius: 520.4,  // 5.204 AU
    orbitalPeriod: 4332.59,
    rotationPeriod: 0.414,
    axialTilt: 3.13,
    color: 0xd4a574,
    parent: null,
    textures: { map: 'textures/jupiter.jpg' },
  },
  {
    name: 'Saturn',
    type: 'planet',
    displayRadius: 4.5,
    displayOrbitalRadius: 953.7,  // 9.537 AU
    orbitalPeriod: 10759.22,
    rotationPeriod: 0.444,
    axialTilt: 26.73,
    color: 0xe8d5a3,
    parent: null,
    textures: { map: 'textures/saturn.jpg' },
    rings: { innerRadius: 6, outerRadius: 10, texture: 'textures/saturn_ring.png' },
  },

  // Earth's moon
  {
    name: 'Moon',
    type: 'moon',
    displayRadius: 0.4,
    displayOrbitalRadius: 5,
    orbitalPeriod: 27.32,
    rotationPeriod: 27.32,        // tidally locked
    axialTilt: 6.68,
    color: 0xcccccc,
    parent: 'Earth',
    textures: { map: 'textures/moon.jpg' },
  },

  // Jupiter's Galilean moons
  {
    name: 'Io',
    type: 'moon',
    displayRadius: 0.35,
    displayOrbitalRadius: 7,
    orbitalPeriod: 1.769,
    rotationPeriod: 1.769,
    axialTilt: 0.04,
    color: 0xddcc44,
    parent: 'Jupiter',
  },
  {
    name: 'Europa',
    type: 'moon',
    displayRadius: 0.3,
    displayOrbitalRadius: 9,
    orbitalPeriod: 3.551,
    rotationPeriod: 3.551,
    axialTilt: 0.1,
    color: 0xccbbaa,
    parent: 'Jupiter',
  },
  {
    name: 'Ganymede',
    type: 'moon',
    displayRadius: 0.45,
    displayOrbitalRadius: 12,
    orbitalPeriod: 7.155,
    rotationPeriod: 7.155,
    axialTilt: 0.2,
    color: 0xaa9988,
    parent: 'Jupiter',
  },
  {
    name: 'Callisto',
    type: 'moon',
    displayRadius: 0.4,
    displayOrbitalRadius: 15,
    orbitalPeriod: 16.689,
    rotationPeriod: 16.689,
    axialTilt: 0.2,
    color: 0x887766,
    parent: 'Jupiter',
  },

  // Saturn's moon
  {
    name: 'Titan',
    type: 'moon',
    displayRadius: 0.45,
    displayOrbitalRadius: 10,
    orbitalPeriod: 15.945,
    rotationPeriod: 15.945,
    axialTilt: 0.3,
    color: 0xddaa55,
    parent: 'Saturn',
  },
];
