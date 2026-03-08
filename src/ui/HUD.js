export class HUD {
  constructor(timeController) {
    this.timeController = timeController;

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

    const controls = document.createElement('div');
    controls.style.cssText = 'font-size: 12px; opacity: 0.6; margin-top: 8px;';
    controls.appendChild(document.createTextNode('Drag \u2014 rotate'));
    controls.appendChild(document.createElement('br'));
    controls.appendChild(document.createTextNode('Scroll \u2014 zoom'));
    controls.appendChild(document.createElement('br'));
    controls.appendChild(document.createTextNode('MMB \u2014 pan'));
    controls.appendChild(document.createElement('br'));
    controls.appendChild(document.createTextNode('Space \u2014 pause/play'));

    this.element.appendChild(title);
    this.element.appendChild(this.timeScaleEl);
    this.element.appendChild(sliderContainer);
    this.element.appendChild(this.dateEl);
    this.element.appendChild(this.pauseEl);
    this.element.appendChild(controls);
    document.body.appendChild(this.element);

    // Space bar toggles pause (only when not typing in an input)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        timeController.togglePause();
      }
    });
  }

  update() {
    const tc = this.timeController;
    this.timeScaleEl.textContent = `Speed: ${tc.timeScaleLabel}`;
    this.dateEl.textContent = tc.simulatedDate.toISOString().slice(0, 10);
    this.pauseEl.textContent = tc.paused ? 'PAUSED' : '';
  }
}
