import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  THEME_STORAGE_KEY,
  applyTheme,
  normalizeThemePreference,
  readStoredTheme,
  resolveInitialTheme,
  saveThemePreference,
  watchSystemTheme,
} from '../src/lib/theme.js';

describe('theme helpers', () => {
  it('normalizes only supported theme values', () => {
    assert.strictEqual(normalizeThemePreference('light'), 'light');
    assert.strictEqual(normalizeThemePreference('dark'), 'dark');
    assert.strictEqual(normalizeThemePreference('system'), null);
    assert.strictEqual(normalizeThemePreference(null), null);
  });

  it('resolves initial theme from stored preference first', () => {
    assert.strictEqual(resolveInitialTheme({ storedTheme: 'dark', prefersDark: false }), 'dark');
    assert.strictEqual(resolveInitialTheme({ storedTheme: 'light', prefersDark: true }), 'light');
  });

  it('falls back to system preference when no stored theme exists', () => {
    assert.strictEqual(resolveInitialTheme({ storedTheme: null, prefersDark: true }), 'dark');
    assert.strictEqual(resolveInitialTheme({ storedTheme: null, prefersDark: false }), 'light');
  });

  it('reads and writes the stored theme preference', () => {
    const storage = {
      value: null,
      getItem(key) {
        return key === THEME_STORAGE_KEY ? this.value : null;
      },
      setItem(key, value) {
        if (key === THEME_STORAGE_KEY) {
          this.value = value;
        }
      },
    };

    assert.strictEqual(readStoredTheme(storage), null);
    saveThemePreference('dark', storage);
    assert.strictEqual(readStoredTheme(storage), 'dark');
  });

  it('applies the theme to the document root hook', () => {
    const doc = {
      documentElement: {
        dataset: {},
        setAttribute(name, value) {
          this.dataset[name] = value;
        },
      },
    };

    applyTheme('dark', doc);
    assert.strictEqual(doc.documentElement.dataset['data-theme'], 'dark');
  });

  it('watches live system theme changes', () => {
    let listener = null;
    const observed = [];
    const mediaQueryList = {
      addEventListener(event, callback) {
        assert.strictEqual(event, 'change');
        listener = callback;
      },
      removeEventListener(event, callback) {
        assert.strictEqual(event, 'change');
        assert.strictEqual(callback, listener);
        listener = null;
      },
    };

    const stop = watchSystemTheme(mediaQueryList, (theme) => observed.push(theme));
    assert.ok(listener);

    listener({ matches: true });
    listener({ matches: false });
    assert.deepStrictEqual(observed, ['dark', 'light']);

    stop();
    assert.strictEqual(listener, null);
  });
});
