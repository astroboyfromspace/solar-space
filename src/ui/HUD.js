import { BODIES } from '../data/bodies.js';

export class HUD {
  constructor(timeController) {
    this.timeController = timeController;
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
    defaultOpt.textContent = '-- Land on body --';
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
      'Click body \u2014 land',
      'Space \u2014 pause/play',
    ]);
  }

  _setSurfaceHints() {
    this._setHintLines([
      'Mouse \u2014 look around',
      'WASD \u2014 walk',
      'Shift \u2014 run',
      'F \u2014 return to free-fly',
      'Space \u2014 pause/play',
    ]);
  }

  setMode(mode) {
    if (mode === 'surface') {
      this.modeEl.style.display = 'block';
      this.modeEl.textContent = 'SURFACE VIEW';
      this._setSurfaceHints();
    } else {
      this.modeEl.style.display = 'none';
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
  }
}
