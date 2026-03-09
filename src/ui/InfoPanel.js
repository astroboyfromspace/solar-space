export class InfoPanel {
  constructor() {
    this.onExploreSurface = null;
    this.onClose = null;
    this._currentBody = null;

    // Side panel (right side, no backdrop — doesn't block the 3D scene)
    this.card = document.createElement('div');
    Object.assign(this.card.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      bottom: '16px',
      width: '320px',
      background: 'rgba(10, 10, 20, 0.88)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      overflowY: 'auto',
      padding: '24px 24px',
      fontFamily: 'monospace',
      color: 'rgba(255, 255, 255, 0.9)',
      zIndex: '100',
      display: 'none',
      pointerEvents: 'auto',
    });

    // Close button
    const closeBtn = document.createElement('button');
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '12px',
      right: '16px',
      background: 'none',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '20px',
      cursor: 'pointer',
      padding: '4px 8px',
      lineHeight: '1',
    });
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => {
      if (this.onClose) this.onClose();
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = 'rgba(255, 255, 255, 0.9)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = 'rgba(255, 255, 255, 0.5)';
    });

    // Body name
    this.nameEl = document.createElement('div');
    Object.assign(this.nameEl.style, {
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '4px',
    });

    // Body type
    this.typeEl = document.createElement('div');
    Object.assign(this.typeEl.style, {
      fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.45)',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      marginBottom: '20px',
    });

    // Stats section
    this.statsEl = document.createElement('div');
    Object.assign(this.statsEl.style, {
      marginBottom: '16px',
      lineHeight: '1.8',
      fontSize: '13px',
    });

    // Features description
    this.featuresEl = document.createElement('div');
    Object.assign(this.featuresEl.style, {
      marginBottom: '16px',
      lineHeight: '1.6',
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.8)',
    });

    // Facts list
    this.factsEl = document.createElement('div');
    Object.assign(this.factsEl.style, {
      marginBottom: '24px',
    });

    // Explore Surface button
    this.exploreBtn = document.createElement('button');
    Object.assign(this.exploreBtn.style, {
      background: 'rgba(68, 136, 255, 0.2)',
      border: '1px solid rgba(68, 136, 255, 0.4)',
      color: '#4488ff',
      fontFamily: 'monospace',
      fontSize: '14px',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      width: '100%',
    });
    this.exploreBtn.textContent = 'Explore Surface';
    this.exploreBtn.addEventListener('click', () => {
      if (this.onExploreSurface) this.onExploreSurface(this._currentBody);
    });
    this.exploreBtn.addEventListener('mouseenter', () => {
      this.exploreBtn.style.background = 'rgba(68, 136, 255, 0.35)';
    });
    this.exploreBtn.addEventListener('mouseleave', () => {
      this.exploreBtn.style.background = 'rgba(68, 136, 255, 0.2)';
    });

    // Assemble
    this.card.appendChild(closeBtn);
    this.card.appendChild(this.nameEl);
    this.card.appendChild(this.typeEl);
    this.card.appendChild(this.statsEl);
    this.card.appendChild(this.featuresEl);
    this.card.appendChild(this.factsEl);
    this.card.appendChild(this.exploreBtn);
    document.body.appendChild(this.card);
  }

  show(bodyData, trivia) {
    this._currentBody = bodyData.name;
    this.nameEl.textContent = bodyData.name;

    const typeLabels = { star: 'Star', planet: 'Planet', moon: 'Moon' };
    this.typeEl.textContent = typeLabels[bodyData.type] || bodyData.type;

    // Clear previous content
    this.statsEl.textContent = '';
    this.featuresEl.textContent = '';
    this.factsEl.textContent = '';

    if (trivia) {
      this._addStat('Radius', trivia.realRadius);
      this._addStat('Distance', trivia.realDistance);
      this._addStat('Orbital period', this._formatPeriod(bodyData.orbitalPeriod));
      this._addStat('Day length', this._formatPeriod(bodyData.rotationPeriod));

      this.featuresEl.textContent = trivia.features;

      for (const fact of trivia.facts) {
        const row = document.createElement('div');
        Object.assign(row.style, {
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'rgba(255, 255, 255, 0.65)',
          marginBottom: '8px',
          paddingLeft: '16px',
          position: 'relative',
        });

        const bullet = document.createElement('span');
        Object.assign(bullet.style, {
          position: 'absolute',
          left: '0',
          color: 'rgba(68, 136, 255, 0.6)',
        });
        bullet.textContent = '\u2022';

        const text = document.createTextNode(fact);
        row.appendChild(bullet);
        row.appendChild(text);
        this.factsEl.appendChild(row);
      }
    }

    this.card.style.display = 'block';
  }

  hide() {
    this.card.style.display = 'none';
    this._currentBody = null;
  }

  get isVisible() {
    return this.card.style.display !== 'none';
  }

  _addStat(label, value) {
    const row = document.createElement('div');

    const labelSpan = document.createElement('span');
    Object.assign(labelSpan.style, {
      color: 'rgba(255, 255, 255, 0.45)',
    });
    labelSpan.textContent = label + ': ';

    const valueText = document.createTextNode(value);
    row.appendChild(labelSpan);
    row.appendChild(valueText);
    this.statsEl.appendChild(row);
  }

  _formatPeriod(days) {
    if (!days) return 'N/A';
    const absDays = Math.abs(days);
    const retrograde = days < 0 ? ' (retrograde)' : '';
    if (absDays < 1) {
      return `${(absDays * 24).toFixed(1)} hours${retrograde}`;
    }
    if (absDays < 365.25) {
      return `${absDays.toFixed(1)} days${retrograde}`;
    }
    return `${(absDays / 365.25).toFixed(1)} years${retrograde}`;
  }
}
