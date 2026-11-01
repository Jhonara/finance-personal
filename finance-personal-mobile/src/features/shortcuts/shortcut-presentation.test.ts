import { describe, expect, it } from 'vitest';
import { nativeShortcutAvailability } from './shortcut-presentation';

describe('shortcut availability by platform', () => {
  it.each([true, false])(
    'describes Android launcher shortcuts without suggesting iPhone setup (%s)',
    (available) => {
      const message = nativeShortcutAvailability('android', available);
      expect(message).toContain('mantén pulsado el icono');
      expect(message).toContain('tarjetas vinculadas');
      expect(message).not.toMatch(/iPhone|iOS|Expo Go/);
    },
  );

  it('distinguishes installed iPhone actions from an unavailable native bridge', () => {
    expect(nativeShortcutAvailability('ios', true)).toContain('están disponibles');
    expect(nativeShortcutAvailability('ios', false)).toContain('requieren la versión nativa');
  });

  it('keeps unsupported platforms focused on card linking', () => {
    expect(nativeShortcutAvailability('web', false)).toContain('identificar la cuenta');
    expect(nativeShortcutAvailability('web', false)).not.toContain('mantén pulsado');
  });
});
