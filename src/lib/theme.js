export const THEME_STORAGE_KEY = 'project-md-theme';

export function normalizeThemePreference(value) {
  return value === 'light' || value === 'dark' ? value : null;
}

export function readStoredTheme(storage = globalThis.localStorage) {
  return normalizeThemePreference(storage?.getItem?.(THEME_STORAGE_KEY) ?? null);
}

export function saveThemePreference(theme, storage = globalThis.localStorage) {
  storage?.setItem?.(THEME_STORAGE_KEY, theme);
}

export function resolveInitialTheme({ storedTheme, prefersDark }) {
  return normalizeThemePreference(storedTheme) || (prefersDark ? 'dark' : 'light');
}

export function applyTheme(theme, doc = globalThis.document) {
  doc?.documentElement?.setAttribute('data-theme', theme);
  return theme;
}

export function watchSystemTheme(mediaQueryList, callback) {
  if (!mediaQueryList) {
    return () => {};
  }

  const handler = (event) => callback(event.matches ? 'dark' : 'light');

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handler);
    return () => mediaQueryList.removeEventListener('change', handler);
  }

  mediaQueryList.addListener(handler);
  return () => mediaQueryList.removeListener(handler);
}
