import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
}));
import { darkPalette, lightPalette, sizes, typography } from './index';

function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = hex
      .slice(1)
      .match(/../g)!
      .map((channel) => parseInt(channel, 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
describe('accessible design tokens', () => {
  for (const [name, palette] of Object.entries({ light: lightPalette, dark: darkPalette })) {
    it(`${name}: text and financial semantics have readable contrast`, () => {
      for (const surface of ['background', 'surface', 'surfaceElevated'] as const) {
        for (const ink of ['textPrimary', 'textSecondary', 'textMuted'] as const)
          expect(contrast(palette[ink], palette[surface]), `${ink}/${surface}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const tone of ['income', 'expense', 'debt', 'warning', 'info'] as const)
        expect(contrast(palette[tone], palette[`${tone}Soft`]), tone).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.onPrimary, palette.primaryStrong)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.controlBorder, palette.surface)).toBeGreaterThanOrEqual(3);
    });
  }
  it('keeps numeric alignment and adequate base touch targets', () => {
    expect(typography.moneyLarge.fontVariant).toContain('tabular-nums');
    expect(typography.moneyMedium.fontFamily).toContain('Inter');
    expect(sizes.touchTarget).toBeGreaterThanOrEqual(48);
  });
});
