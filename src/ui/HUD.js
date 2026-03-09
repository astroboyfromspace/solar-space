import * as THREE from 'three';
import { BODIES } from '../data/bodies.js';

export class HUD {
  constructor(timeController, cameraManager) {
    this.timeController = timeController;
    this.cameraManager = cameraManager;
    this.onBodySelected = null;

    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 16px;
      left: 16px;
      color: rgba(255, 255, 255, 0.8);
      font-family: monospace;
      font-size: 14px;
      pointer-events: none;
      user-select: none;
      line-height: 1.6;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 8px;';
    title.textContent = 'Solar System';

    // Mode indicator
    this.modeEl = document.createElement('div');
    this.modeEl.style.cssText = 'color: #44ff44; font-weight: bold; margin-bottom: 4px; display: none;';

    // Location (lat/lon) in surface mode
    this.locationEl = document.createElement('div');
    this.locationEl.style.cssText = 'font-size: 13px; opacity: 0.7; margin-bottom: 4px; display: none;';

    // Time info
    this.timeScaleEl = document.createElement('div');
    this.dateEl = document.createElement('div');
    this.pauseEl = document.createElement('div');
    this.pauseEl.style.cssText = 'color: #ff4444; font-weight: bold;';

    // Speed slider container (needs pointer-events so user can drag it)
    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = 'pointer-events: auto; margin: 6px 0;';
    sliderContainer.addEventListener('pointerdown', (e) => e.stopPropagation());

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = '1';
    this.slider.step = '0.001';
    this.slider.value = String(timeController.sliderValue);
    this.slider.style.cssText = 'width: 160px; cursor: pointer;';
    this.slider.addEventListener('input', () => {
      timeController.setTimeScaleFromSlider(parseFloat(this.slider.value));
    });
    sliderContainer.appendChild(this.slider);

    // Body picker dropdown
    const selectContainer = document.createElement('div');
    selectContainer.style.cssText = 'pointer-events: auto; margin: 6px 0;';
    selectContainer.addEventListener('pointerdown', (e) => e.stopPropagation());

    this.bodySelect = document.createElement('select');
    this.bodySelect.style.cssText = `
      background: rgba(0, 0, 0, 0.7);
      color: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.3);
      font-family: monospace;
      font-size: 13px;
      padding: 4px 8px;
      cursor: pointer;
      outline: none;
    `;

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Go to body --';
    this.bodySelect.appendChild(defaultOpt);

    for (const body of BODIES) {
      const opt = document.createElement('option');
      opt.value = body.name;
      opt.textContent = body.type === 'moon' ? `\u00A0\u00A0${body.name}` : body.name;
      this.bodySelect.appendChild(opt);
    }

    this.bodySelect.addEventListener('change', () => {
      const name = this.bodySelect.value;
      if (name && this.onBodySelected) {
        this.onBodySelected(name);
      }
      this.bodySelect.value = '';
    });
    selectContainer.appendChild(this.bodySelect);

    // Control hints
    this.controlsEl = document.createElement('div');
    this.controlsEl.style.cssText = 'font-size: 12px; opacity: 0.6; margin-top: 8px;';
    this._setFreeflyHints();

    this.element.appendChild(title);
    this.element.appendChild(this.modeEl);
    this.element.appendChild(this.locationEl);
    this.element.appendChild(this.timeScaleEl);
    this.element.appendChild(sliderContainer);
    this.element.appendChild(selectContainer);
    this.element.appendChild(this.dateEl);
    this.element.appendChild(this.pauseEl);
    this.element.appendChild(this.controlsEl);
    document.body.appendChild(this.element);

    // Space bar toggles pause (only when not typing in an input)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        timeController.togglePause();
      }
    });

    // Sky labels container
    this._labelContainer = document.createElement('div');
    this._labelContainer.style.cssText = 'position: fixed; inset: 0; pointer-events: none; overflow: hidden;';
    document.body.appendChild(this._labelContainer);
    this._labels = new Map();
    this._tmpVec = new THREE.Vector3();
  }

  _clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  _setHintLines(lines) {
    this._clearElement(this.controlsEl);
    lines.forEach((line, i) => {
      this.controlsEl.appendChild(document.createTextNode(line));
      if (i < lines.length - 1) this.controlsEl.appendChild(document.createElement('br'));
    });
  }

  _setFreeflyHints() {
    this._setHintLines([
      'Drag \u2014 rotate',
      'Scroll \u2014 zoom',
      'MMB \u2014 pan',
      'Click body \u2014 focus',
      'O \u2014 toggle orbits',
      'Space \u2014 pause/play',
    ]);
  }

  _setSurfaceHints() {
    this._setHintLines([
      'Mouse \u2014 look around',
      'WASD \u2014 walk',
      'Shift \u2014 run',
      'F \u2014 return to free-fly',
      'O \u2014 toggle orbits',
      'Space \u2014 pause/play',
    ]);
  }

  setMode(mode, bodyName) {
    if (mode === 'surface') {
      this.modeEl.style.display = 'block';
      this.modeEl.textContent = bodyName ? `SURFACE VIEW \u2014 ${bodyName}` : 'SURFACE VIEW';
      this._setSurfaceHints();
    } else {
      this.modeEl.style.display = 'none';
      this.locationEl.style.display = 'none';
      this._setFreeflyHints();
    }
  }

  update() {
    const tc = this.timeController;

    const speedText = `Speed: ${tc.timeScaleLabel}`;
    if (this._lastSpeed !== speedText) {
      this._lastSpeed = speedText;
      this.timeScaleEl.textContent = speedText;
    }

    const dateText = tc.simulatedDate.toISOString().slice(0, 10);
    if (this._lastDate !== dateText) {
      this._lastDate = dateText;
      this.dateEl.textContent = dateText;
    }

    const pauseText = tc.paused ? 'PAUSED' : '';
    if (this._lastPause !== pauseText) {
      this._lastPause = pauseText;
      this.pauseEl.textContent = pauseText;
    }

    this._updateLocation();
    this._updateSkyLabels();
  }

  _updateLocation() {
    const info = this.cameraManager.getSurfaceInfo();
    if (!info) {
      if (this.locationEl.style.display !== 'none') {
        this.locationEl.style.display = 'none';
      }
      return;
    }
    this.locationEl.style.display = 'block';
    const latDeg = Math.abs(THREE.MathUtils.radToDeg(info.latitude)).toFixed(1);
    const lonDeg = Math.abs(THREE.MathUtils.radToDeg(info.longitude)).toFixed(1);
    const latDir = info.latitude >= 0 ? 'N' : 'S';
    const lonDir = info.longitude >= 0 ? 'E' : 'W';
    const text = `${latDeg}\u00B0${latDir} ${lonDeg}\u00B0${lonDir}`;
    if (this._lastLoc !== text) {
      this._lastLoc = text;
      this.locationEl.textContent = text;
    }
  }

  _getOrCreateLabel(name) {
    let el = this._labels.get(name);
    if (el) return el;
    el = document.createElement('div');
    el.style.cssText = `
      position: absolute;
      left: 0; top: 0;
      color: rgba(255, 255, 255, 0.7);
      font-family: monospace;
      font-size: 11px;
      text-shadow: 0 0 4px rgba(0,0,0,0.8);
      white-space: nowrap;
      pointer-events: none;
      display: none;
    `;
    el.textContent = name;
    this._labelContainer.appendChild(el);
    this._labels.set(name, el);
    return el;
  }

  _updateSkyLabels() {
    const cm = this.cameraManager;
    if (cm.mode !== 'surface') {
      for (const el of this._labels.values()) {
        if (el.style.display !== 'none') el.style.display = 'none';
      }
      return;
    }

    const camera = cm.camera;
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

    for (const { name, body } of cm.iterBodies()) {
      const el = this._getOrCreateLabel(name);
      body.mesh.getWorldPosition(this._tmpVec);
      this._tmpVec.project(camera);

      if (this._tmpVec.z > 1) {
        if (el.style.display !== 'none') el.style.display = 'none';
        continue;
      }

      const x = this._tmpVec.x * halfW + halfW;
      const y = -this._tmpVec.y * halfH + halfH;

      if (x < -50 || x > window.innerWidth + 50 || y < -50 || y > window.innerHeight + 50) {
        if (el.style.display !== 'none') el.style.display = 'none';
        continue;
      }

      el.style.display = 'block';
      el.style.transform = `translate(${x - 0.5}px, ${y}px) translate(-50%, -100%)`;
    }
  }
}
