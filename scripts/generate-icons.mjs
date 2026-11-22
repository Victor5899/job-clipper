// Renders the Job Clipper toolbar icons (lime rounded square with a dark bookmark glyph)
// to PNG without any image tooling, so the icons can be regenerated offline.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SIZES = [16, 32, 48, 128];
const SAMPLES = 4;
const LIME = [0xc6, 0xf1, 0x35];
const INK = [0x0a, 0x0c, 0x06];

// Geometry in unit space (0..1), shared with src/ui/components/BrandMark.tsx.
const CORNER = 0.24;
const BOOKMARK = { left: 0.32, right: 0.68, top: 0.22, bottom: 0.8, notch: 0.62 };

function insideRoundedSquare(x, y) {
  const cx = Math.min(Math.max(x, CORNER), 1 - CORNER);
  const cy = Math.min(Math.max(y, CORNER), 1 - CORNER);
  return (x - cx) ** 2 + (y - cy) ** 2 <= CORNER ** 2;
}

function insideBookmark(x, y) {
  const { left, right, top, bottom, notch } = BOOKMARK;
  if (x < left || x > right || y < top || y > bottom) return false;
  const mid = (left + right) / 2;
  const half = (right - left) / 2;
  // V-shaped notch rising from the bottom edge to `notch` at the centre line.
  const notchY = bottom - ((bottom - notch) * (half - Math.abs(x - mid))) / half;
  return y <= notchY;
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let cover = 0;
      let ink = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES) / size;
          const y = (py + (sy + 0.5) / SAMPLES) / size;
          if (!insideRoundedSquare(x, y)) continue;
          cover++;
          if (insideBookmark(x, y)) ink++;
        }
      }
      const total = SAMPLES * SAMPLES;
      const inkShare = cover === 0 ? 0 : ink / cover;
      const offset = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) {
        pixels[offset + c] = Math.round(LIME[c] * (1 - inkShare) + INK[c] * inkShare);
      }
      pixels[offset + 3] = Math.round((cover / total) * 255);
    }
  }
  return encodePng(size, size, pixels);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rows[y * (width * 4 + 1)] = 0; // no filter
    rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = new URL("../public/icons/", import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const size of SIZES) {
  writeFileSync(new URL(`icon-${size}.png`, outDir), render(size));
  console.log(`icon-${size}.png`);
}
