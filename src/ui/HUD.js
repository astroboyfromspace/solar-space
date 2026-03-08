export class HUD {
  constructor() {
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

    const controls = document.createElement('div');
    controls.style.cssText = 'font-size: 12px; opacity: 0.6;';
    controls.appendChild(document.createTextNode('Drag \u2014 rotate'));
    controls.appendChild(document.createElement('br'));
    controls.appendChild(document.createTextNode('Scroll \u2014 zoom'));
    controls.appendChild(document.createElement('br'));
    controls.appendChild(document.createTextNode('MMB \u2014 pan'));

    this.element.appendChild(title);
    this.element.appendChild(controls);
    document.body.appendChild(this.element);
  }
}
