const fs = require('fs');
const path = require('path');
const qrcode = require('../assets/qrcode.js');

const INK = '#b91c2c';
const EYE = '#16181d';

function generateBrandedQrSvg(url, logoPath, opts = {}) {
  const frame = opts.frame || 'circle'; // 'circle' | 'square'
  const logoAspect = opts.logoAspect || 1; // width / height of the logo image

  const qr = qrcode(0, 'H');
  qr.addData(url);
  qr.make();

  const n = qr.getModuleCount();
  const cell = 24;
  const quiet = 3;
  const size = (n + quiet * 2) * cell;
  const offset = quiet * cell;

  function inFinder(r, c) {
    const zones = [[0, 0], [0, n - 7], [n - 7, 0]];
    return zones.some(([zr, zc]) => r >= zr && r < zr + 7 && c >= zc && c < zc + 7);
  }

  // Reserve a clear zone shaped to the logo's aspect ratio (wide logos get a
  // wide slot instead of being letterboxed inside a square), sized to keep
  // occlusion within what 'H' error correction can recover from.
  const targetAreaFrac = opts.areaFrac || 0.10; // kept well under the ~0.13 point where scanning starts failing
  let clearHmod = Math.round(Math.sqrt((targetAreaFrac * n * n) / logoAspect));
  let clearWmod = Math.round(clearHmod * logoAspect);
  clearWmod = Math.min(clearWmod, Math.floor(n * 0.62));
  clearHmod = Math.min(clearHmod, Math.floor(n * 0.32));
  const rowStart = Math.floor((n - clearHmod) / 2);
  const rowEnd = rowStart + clearHmod;
  const colStart = Math.floor((n - clearWmod) / 2);
  const colEnd = colStart + clearWmod;
  function inClearZone(r, c) {
    return r >= rowStart && r < rowEnd && c >= colStart && c < colEnd;
  }

  let dots = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      if (inFinder(r, c) || inClearZone(r, c)) continue;
      const cx = offset + c * cell + cell / 2;
      const cy = offset + r * cell + cell / 2;
      dots += `<circle cx="${cx}" cy="${cy}" r="${cell * 0.44}" fill="${INK}"/>`;
    }
  }

  function eye(zr, zc) {
    const x = offset + zc * cell;
    const y = offset + zr * cell;
    const outerSize = cell * 7;
    const outerR = cell * 2;
    const midInset = cell * 1;
    const midSize = outerSize - midInset * 2;
    const midR = cell * 1.3;
    const innerInset = cell * 2.1;
    const innerSize = outerSize - innerInset * 2;
    const innerR = cell * 0.9;
    return `
      <rect x="${x}" y="${y}" width="${outerSize}" height="${outerSize}" rx="${outerR}" fill="${EYE}"/>
      <rect x="${x + midInset}" y="${y + midInset}" width="${midSize}" height="${midSize}" rx="${midR}" fill="#ffffff"/>
      <rect x="${x + innerInset}" y="${y + innerInset}" width="${innerSize}" height="${innerSize}" rx="${innerR}" fill="${EYE}"/>
    `;
  }

  const eyes = eye(0, 0) + eye(0, n - 7) + eye(n - 7, 0);

  const clearWpx = clearWmod * cell;
  const clearHpx = clearHmod * cell;
  const clearX = offset + colStart * cell;
  const clearY = offset + rowStart * cell;
  const cornerR = Math.min(clearWpx, clearHpx) * 0.18;
  const padPx = Math.min(clearWpx, clearHpx) * 0.12;

  let logoBlock;
  if (logoPath && fs.existsSync(logoPath)) {
    const ext = path.extname(logoPath).slice(1);
    const mime = ext === 'png' ? 'image/png' : `image/${ext}`;
    const b64 = fs.readFileSync(logoPath).toString('base64');
    logoBlock = `
      <rect x="${clearX}" y="${clearY}" width="${clearWpx}" height="${clearHpx}" rx="${cornerR}" fill="#ffffff"/>
      <image href="data:${mime};base64,${b64}" x="${clearX + padPx}" y="${clearY + padPx}" width="${clearWpx - padPx * 2}" height="${clearHpx - padPx * 2}" preserveAspectRatio="xMidYMid meet"/>
    `;
  } else {
    logoBlock = `<rect x="${clearX}" y="${clearY}" width="${clearWpx}" height="${clearHpx}" rx="${cornerR}" fill="#ffffff"/>`;
  }

  const inner = `<rect width="${size}" height="${size}" fill="#ffffff"/>${dots}${eyes}${logoBlock}`;

  if (frame === 'square') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${inner}
</svg>`;
  }

  // Circular badge frame — the QR *data* stays square (clipping the finder
  // corners into a circle would break scanning); we wrap it in extra white
  // space plus a colored ring so it *reads* as round.
  const ringWidth = cell * 1.1;
  const diameter = Math.round(size * 1.56);
  const center = diameter / 2;
  const qrOffset = (diameter - size) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}">
  <circle cx="${center}" cy="${center}" r="${center - ringWidth / 2}" fill="#ffffff" stroke="${INK}" stroke-width="${ringWidth}"/>
  <g transform="translate(${qrOffset}, ${qrOffset})">
    ${inner}
  </g>
</svg>`;
}

module.exports = { generateBrandedQrSvg };
