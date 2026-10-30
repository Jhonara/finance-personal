import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Temporary icon export for the code-native BrandMark. No external artwork or runtime dependency.
const output = join(process.cwd(), 'assets', 'brand');
mkdirSync(output, { recursive: true });
const palette = {
  deep: [13, 40, 46],
  teal: [13, 68, 75],
  mint: [0, 229, 153],
  mintLight: [36, 246, 180],
  coral: [255, 107, 107],
  white: [255, 255, 255],
};

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}
function circle(x, y, cx, cy, radius, pixel) {
  return clamp((radius - Math.hypot(x - cx, y - cy)) / pixel + 0.5);
}
function roundedBox(x, y, cx, cy, width, height, radius, angle, pixel) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  const localX = c * dx + s * dy;
  const localY = -s * dx + c * dy;
  const qx = Math.abs(localX) - (width / 2 - radius);
  const qy = Math.abs(localY) - (height / 2 - radius);
  const distance = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  return clamp(0.5 - distance / pixel);
}
function composite(pixels, index, color, opacity) {
  if (opacity <= 0) return;
  const sourceAlpha = clamp(opacity);
  const oldAlpha = pixels[index + 3] / 255;
  const finalAlpha = sourceAlpha + oldAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel++) {
    pixels[index + channel] = Math.round(
      (color[channel] * sourceAlpha + pixels[index + channel] * oldAlpha * (1 - sourceAlpha)) / finalAlpha,
    );
  }
  pixels[index + 3] = Math.round(finalAlpha * 255);
}

function raster(size, variant) {
  const pixels = Buffer.alloc(size * size * 4);
  const square =
    variant === 'android' || variant === 'monochrome'
      ? { x: 0.18, y: 0.18, size: 0.64 }
      : { x: 0, y: 0, size: 1 };
  const monochrome = variant === 'monochrome';
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const u = (column + 0.5) / size;
      const v = (row + 0.5) / size;
      const index = (row * size + column) * 4;
      const x = (u - square.x) / square.size;
      const y = (v - square.y) / square.size;
      const pixel = 1 / (size * square.size);
      if (variant === 'icon' || variant === 'favicon') {
        const blend = clamp((u + v) / 2);
        for (let channel = 0; channel < 3; channel++) {
          pixels[index + channel] = Math.round(
            palette.deep[channel] * (1 - blend) + palette.teal[channel] * blend,
          );
        }
        pixels[index + 3] = 255;
      } else if (variant === 'android') {
        composite(pixels, index, palette.deep, roundedBox(x, y, 0.5, 0.5, 1, 1, 0.28, 0, pixel));
      }
      const ink = monochrome ? palette.white : palette.mint;
      composite(
        pixels,
        index,
        ink,
        roundedBox(x, y, 0.45, 0.54, 0.22, 0.58, 0.11, (34 * Math.PI) / 180, pixel),
      );
      composite(
        pixels,
        index,
        monochrome ? palette.white : palette.mintLight,
        roundedBox(x, y, 0.63, 0.36, 0.4, 0.16, 0.08, (-28 * Math.PI) / 180, pixel),
      );
      if (!monochrome) composite(pixels, index, palette.coral, circle(x, y, 0.81, 0.18, 0.06, pixel));
    }
  }
  return encodePng(size, size, pixels);
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function chunk(type, data) {
  const block = Buffer.alloc(12 + data.length);
  block.writeUInt32BE(data.length, 0);
  block.write(type, 4, 4, 'ascii');
  data.copy(block, 8);
  let crc = 0xffffffff;
  for (let index = 4; index < 8 + data.length; index++) {
    crc = crcTable[(crc ^ block[index]) & 0xff] ^ (crc >>> 8);
  }
  block.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
  return block;
}
function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row++) {
    pixels.copy(raw, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size, variant] of [
  ['icon.png', 1024, 'icon'],
  ['android-foreground.png', 1024, 'android'],
  ['android-monochrome.png', 1024, 'monochrome'],
  ['splash.png', 512, 'splash'],
  ['favicon.png', 128, 'favicon'],
]) {
  writeFileSync(join(output, name), raster(size, variant));
}
