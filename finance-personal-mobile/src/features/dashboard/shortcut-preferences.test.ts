import { expect, it } from 'vitest';
import { defaultShortcuts, parseShortcutPreference, shortcutPreferenceKey } from './shortcut-preferences';
it('keeps valid selections, removes duplicates and unknown keys, and caps at four', () => {
  expect(parseShortcutPreference('["reports","reports","unknown","inbox"]')).toEqual(['reports', 'inbox']);
  expect(parseShortcutPreference('["reports","inbox","credits","budgets","savings"]')).toHaveLength(4);
  expect(parseShortcutPreference('malformed')).toBeUndefined();
  expect(parseShortcutPreference('[]')).toBeUndefined();
});
it('preserves the existing priority order by default and isolates users', () => {
  expect(defaultShortcuts('debt')[0]).toBe('credits');
  expect(shortcutPreferenceKey(1)).not.toBe(shortcutPreferenceKey(2));
});
