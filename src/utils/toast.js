/**
 * Show a non-blocking toast notification inside #app-toast-region.
 * Falls back cleanly when running in Node test environments.
 */
export function showToast(message, variant = 'info', durationMs = 3600) {
  if (typeof document === 'undefined') return null;

  let region = document.getElementById('app-toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'app-toast-region';
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    if (document.body) {
      document.body.appendChild(region);
    }
  }

  // Keep at most 3 simultaneous toasts by removing the oldest first
  while (region.children && region.children.length >= 3) {
    const oldest = region.children[0];
    if (typeof oldest.remove === 'function') {
      oldest.remove();
    } else if (typeof region.removeChild === 'function') {
      region.removeChild(oldest);
    } else {
      region.children.shift();
    }
  }

  const toast = document.createElement('div');
  toast.className = `app-toast app-toast--${variant}`;
  toast.textContent = String(message || '');
  region.appendChild(toast);

  // Skip auto-dismiss timer during Node unit tests so the runner exits immediately
  const isTestEnv = typeof window !== 'undefined' && Boolean(window.__QUIZ_TEST_ENV__);
  if (!isTestEnv && durationMs > 0) {
    setTimeout(() => {
      if (typeof toast.remove === 'function') {
        toast.remove();
      } else if (toast.parentNode && typeof toast.parentNode.removeChild === 'function') {
        toast.parentNode.removeChild(toast);
      }
    }, durationMs);
  }

  return toast;
}
