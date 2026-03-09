import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const NUM_SAMPLES = 60;

const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSunScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
    uSunOnScreen: { value: 0.0 },
    uIntensity: { value: 0.35 },
    uDecay: { value: 0.95 },
    uDensity: { value: 0.97 },
    uWeight: { value: 0.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uSunScreenPos;
    uniform float uSunOnScreen;
    uniform float uIntensity;
    uniform float uDecay;
    uniform float uDensity;
    uniform float uWeight;
    varying vec2 vUv;

    void main() {
      vec4 sceneColor = texture2D(tDiffuse, vUv);

      if (uSunOnScreen < 0.01) {
        gl_FragColor = sceneColor;
        return;
      }

      vec2 deltaUV = (vUv - uSunScreenPos) * uDensity / float(${NUM_SAMPLES});
      vec2 sampleUV = vUv;
      float illumination = 1.0;
      vec3 rays = vec3(0.0);

      for (int i = 0; i < ${NUM_SAMPLES}; i++) {
        sampleUV -= deltaUV;
        vec3 samp = texture2D(tDiffuse, clamp(sampleUV, 0.0, 1.0)).rgb;
        samp = min(samp, 1.0);
        float lum = dot(samp, vec3(0.2126, 0.7152, 0.0722));
        float bright = smoothstep(1.5, 3.0, lum);
        rays += samp * bright * illumination * uWeight;
        illumination *= uDecay;
      }

      vec3 finalRays = min(rays * uIntensity * uSunOnScreen, 1.5);
      gl_FragColor = vec4(sceneColor.rgb + finalRays, sceneColor.a);
    }
  `,
};

export class GodRaysPass extends Pass {
  constructor(sunObject, camera) {
    super();
    this.sunObject = sunObject;
    this.camera = camera;
    this.sunWorldPos = new THREE.Vector3();

    const shader = GodRaysShader;
    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture;

    // Project Sun world position to screen UV
    this.sunObject.getWorldPosition(this.sunWorldPos);
    const projected = this.sunWorldPos.clone().project(this.camera);

    // Check if Sun is behind camera or far off-screen
    if (projected.z > 1 || Math.abs(projected.x) > 1.5 || Math.abs(projected.y) > 1.5) {
      this.uniforms.uSunOnScreen.value = 0.0;
    } else {
      // Fade out as Sun moves toward screen edges
      const edgeDist = Math.max(Math.abs(projected.x), Math.abs(projected.y));
      const fade = 1.0 - Math.max(0, (edgeDist - 0.8) / 0.7);
      this.uniforms.uSunOnScreen.value = Math.max(0, Math.min(1, fade));
      this.uniforms.uSunScreenPos.value.set(
        projected.x * 0.5 + 0.5,
        projected.y * 0.5 + 0.5,
      );
    }

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
