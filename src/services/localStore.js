const PREFIX = 'techtroopers:';

export const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const save = (key, value) => {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('techtroopers:update', { detail: { key } }));
  return value;
};

export const reset = (key) => localStorage.removeItem(PREFIX + key);
