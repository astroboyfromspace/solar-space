import { onLoadingProgress, onLoadingComplete } from '../loaders/TextureManager.js';

export class LoadingOverlay {
  constructor() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      inset: '0',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      transition: 'opacity 0.8s ease-out',
    });

    const label = document.createElement('div');
    Object.assign(label.style, {
      color: '#888',
      fontFamily: 'monospace',
      fontSize: '14px',
      marginBottom: '16px',
    });
    label.textContent = 'Loading textures...';

    const barContainer = document.createElement('div');
    Object.assign(barContainer.style, {
      width: '240px',
      height: '4px',
      background: '#222',
      borderRadius: '2px',
      overflow: 'hidden',
    });

    this.bar = document.createElement('div');
    Object.assign(this.bar.style, {
      width: '0%',
      height: '100%',
      background: '#4488ff',
      transition: 'width 0.2s ease-out',
    });

    barContainer.appendChild(this.bar);
    this.overlay.appendChild(label);
    this.overlay.appendChild(barContainer);
    document.body.appendChild(this.overlay);

    onLoadingProgress((progress) => {
      this.bar.style.width = `${Math.round(progress * 100)}%`;
    });

    onLoadingComplete(() => {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.remove();
      }, 800);
    });
  }
}
