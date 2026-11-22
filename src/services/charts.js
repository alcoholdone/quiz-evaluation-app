const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js';
const CHART_JS_INTEGRITY = 'sha384-T/4KgSWuZEPozpPz7rnnp/5lDSnpY1VPJCojf1S81uTHS1E38qgLfMgVsAeRCWc4';

let chartLoadPromise = null;

export function loadChartJS() {
  if (typeof globalThis.Chart !== 'undefined') {
    return Promise.resolve(globalThis.Chart);
  }
  if (typeof document === 'undefined' || !document.head) {
    return Promise.resolve(null);
  }
  if (chartLoadPromise) {
    return chartLoadPromise;
  }

  chartLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = CHART_JS_URL;
    script.integrity = CHART_JS_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.async = true;

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      chartLoadPromise = null;
      if (typeof script.remove === 'function') script.remove();
      resolve(null);
    }, 8000);

    script.addEventListener('load', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(globalThis.Chart || null);
    }, { once: true });

    script.addEventListener('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chartLoadPromise = null;
      if (typeof script.remove === 'function') script.remove();
      resolve(null);
    }, { once: true });

    document.head.appendChild(script);
  });

  return chartLoadPromise;
}
