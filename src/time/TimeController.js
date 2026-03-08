// Time scale range: 1s=1hr to 1s=1yr
export const MIN_TIME_SCALE = 3_600;
export const MAX_TIME_SCALE = 31_557_600;
export const DEFAULT_TIME_SCALE = 86_400; // 1s = 1 day

// J2000 epoch: 2000-01-01T12:00:00Z
export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

// Simulation starts at 2026-01-01T00:00:00Z
export const INITIAL_SIM_TIME = (Date.UTC(2026, 0, 1, 0, 0, 0) - J2000_MS) / 1000;

const LOG_MIN = Math.log(MIN_TIME_SCALE);
const LOG_MAX = Math.log(MAX_TIME_SCALE);
const LOG_RANGE = LOG_MAX - LOG_MIN;

export class TimeController {
  constructor() {
    this.timeScale = DEFAULT_TIME_SCALE;
    this.paused = false;
    this.simulatedTime = INITIAL_SIM_TIME;
  }

  update(realDelta) {
    if (this.paused) return 0;
    const simDelta = realDelta * this.timeScale;
    this.simulatedTime += simDelta;
    return simDelta;
  }

  togglePause() {
    this.paused = !this.paused;
  }

  // slider value 0..1 → log interpolation between MIN and MAX
  setTimeScaleFromSlider(t) {
    this.timeScale = Math.exp(LOG_MIN + t * LOG_RANGE);
  }

  // Returns slider position 0..1 from current timeScale
  get sliderValue() {
    return (Math.log(this.timeScale) - LOG_MIN) / LOG_RANGE;
  }

  get timeScaleLabel() {
    const seconds = this.timeScale;
    if (seconds < 86_400) {
      return `1s = ${(seconds / 3600).toFixed(1)}h`;
    } else if (seconds < 31_557_600) {
      return `1s = ${(seconds / 86_400).toFixed(1)}d`;
    } else {
      return `1s = ${(seconds / 31_557_600).toFixed(2)}y`;
    }
  }

  get simulatedDate() {
    return new Date(J2000_MS + this.simulatedTime * 1000);
  }
}
