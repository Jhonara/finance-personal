import { colors } from '@/theme';

// Report series have their own identities: a user's repeated category colour
// must never merge two different series in a chart.
const lightSeries = [
  '#176F9C',
  '#A15C0A',
  '#7460B8',
  '#087B61',
  '#C34266',
  '#526EAB',
  '#A14896',
  '#7D7021',
  '#226B66',
  '#B55222',
  '#5C6D34',
  '#3C5691',
  '#A84E59',
  '#755C3D',
  '#047C8D',
  '#7B549D',
];
const darkSeries = [
  '#7BC9EF',
  '#F6C775',
  '#B6A3FF',
  '#58D8AE',
  '#F38CA5',
  '#9BAFEB',
  '#DE9CDC',
  '#C9CF6A',
  '#64C6C3',
  '#F2A274',
  '#AAC985',
  '#90A4F6',
  '#EFACB0',
  '#C6B192',
  '#6BD9EC',
  '#C9A4E9',
];

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function chartContrast(first: string, second: string) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function hslHex(hue: number, saturation: number, lightness: number) {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return Math.round((lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

export function chartColors(background: string = colors.surface) {
  return [...(luminance(background) < 0.25 ? darkSeries : lightSeries)];
}

/** Stable across value changes/reordering, and never cycles after six categories. */
export function reportPalette(keys: readonly string[], background: string = colors.surface) {
  const unique = [...new Set(keys)].sort();
  const palette = chartColors(background);
  const used = new Set<string>();
  const result = new Map<string, string>();
  const dark = luminance(background) < 0.25;
  unique.forEach((key, index) => {
    let color = palette[index];
    let attempt = index;
    while (!color || used.has(color)) {
      const hue = (attempt * 137.507764 + 19) % 360;
      let lightness = dark ? 0.71 : 0.39;
      color = hslHex(hue, 0.56 + (attempt % 3) * 0.06, lightness);
      // Non-text chart marks meet 3:1 against the chart surface in both themes.
      while (chartContrast(color, background) < 3 && lightness > 0.15 && lightness < 0.9) {
        lightness += dark ? 0.02 : -0.02;
        color = hslHex(hue, 0.56 + (attempt % 3) * 0.06, lightness);
      }
      attempt += 1;
    }
    used.add(color);
    result.set(key, color);
  });
  return result;
}
