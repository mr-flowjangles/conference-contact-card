// Pass bundle images, sized with sips (ships with macOS — no Pillow needed here).
// Wallet wants exact pixel sizes per @1x/@2x/@3x, so everything is computed, not guessed.

const { execFileSync } = require('child_process');
const path = require('path');

function sips(args) {
  execFileSync('sips', args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

function dimensions(src) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], {
    encoding: 'utf8',
  });
  const width = Number(/pixelWidth:\s*(\d+)/.exec(out)[1]);
  const height = Number(/pixelHeight:\s*(\d+)/.exec(out)[1]);
  return { width, height };
}

// Scale to cover the box, then centre-crop — used for the headshot thumbnail,
// where cropping the edges beats letterboxing a face.
function cover(src, out, size) {
  const { width, height } = dimensions(src);
  const scale = size / Math.min(width, height);
  const w = Math.max(size, Math.round(width * scale));
  const h = Math.max(size, Math.round(height * scale));
  sips(['-s', 'format', 'png', '-z', String(h), String(w), src, '--out', out]);
  sips(['-c', String(size), String(size), out]);
  return out;
}

// Scale to fit inside the box, then pad to exact size on white — used for the
// logo and icon, where clipping the wordmark or the mark would be wrong.
function contain(src, out, boxW, boxH, padColor = 'FFFFFF') {
  const { width, height } = dimensions(src);
  const scale = Math.min(boxW / width, boxH / height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  sips(['-s', 'format', 'png', '-z', String(h), String(w), src, '--out', out]);
  if (w !== boxW || h !== boxH) {
    sips(['-p', String(boxH), String(boxW), '--padColor', padColor, out]);
  }
  return out;
}

// icon  — required; what Wallet shows in notifications and the pass list
// logo  — top-left of the pass face, max 160x50pt
// thumb — right of the primary field on a generic pass (the headshot)
const SPECS = {
  icon: [
    ['icon.png', 29],
    ['icon@2x.png', 58],
    ['icon@3x.png', 87],
  ],
  logo: [
    ['logo.png', 160, 50],
    ['logo@2x.png', 320, 100],
    ['logo@3x.png', 480, 150],
  ],
  thumbnail: [
    ['thumbnail.png', 90],
    ['thumbnail@2x.png', 180],
    ['thumbnail@3x.png', 270],
  ],
};

function buildPassImages({ markPath, logoPath, photoPath, outDir }) {
  const written = [];

  const iconSource = markPath || logoPath;
  if (!iconSource) throw new Error('No icon source: need assets/tspi-mark.png or a logo file.');
  for (const [name, size] of SPECS.icon) {
    // 16% padding matches the home-screen tile icons so the two read as a set
    const inner = Math.round(size * 0.84);
    contain(iconSource, path.join(outDir, name), inner, inner);
    sips(['-p', String(size), String(size), '--padColor', 'FFFFFF', path.join(outDir, name)]);
    written.push(name);
  }

  if (logoPath) {
    for (const [name, w, h] of SPECS.logo) {
      contain(logoPath, path.join(outDir, name), w, h);
      written.push(name);
    }
  }

  if (photoPath) {
    const { width, height } = dimensions(photoPath);
    const source = Math.min(width, height);
    for (const [name, size] of SPECS.thumbnail) {
      // Shipping an upscaled headshot looks worse than letting Wallet scale the
      // @2x down, so skip any variant the source can't actually fill.
      if (size > source) continue;
      cover(photoPath, path.join(outDir, name), size);
      written.push(name);
    }
  }

  return written;
}

// Home-screen tile icons for the QR mini-app: the mark padded onto a white
// square. Was a Pillow script; sips does the same job with nothing to install.
const TILE_SIZES = {
  'apple-touch-icon.png': 180,
  'icon-192.png': 192,
  'icon-512.png': 512,
};

function buildTileIcons(markPath, outDir) {
  const written = [];
  for (const [name, size] of Object.entries(TILE_SIZES)) {
    const out = path.join(outDir, name);
    const inner = size - Math.round(size * 0.16) * 2;
    contain(markPath, out, inner, inner);
    sips(['-p', String(size), String(size), '--padColor', 'FFFFFF', out]);
    written.push(name);
  }
  return written;
}

module.exports = { buildPassImages, buildTileIcons, dimensions };
