#!/usr/bin/env node
// Renders template/card.html + data/<slug>.json -> dist/<slug>/index.html + rob.vcf
// Usage: node build.js data/rob-rose.json

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { generateBrandedQrSvg } = require('./lib/qr-brand');

const dataPath = process.argv[2];
if (!dataPath) {
  console.error('Usage: node build.js data/<person>.json');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const root = __dirname;
const outDir = path.join(root, 'dist', data.slug);
fs.mkdirSync(outDir, { recursive: true });

// ---- vCard ----
function foldLine(line) {
  // RFC 2426 line folding: max 75 octets per line, continuation starts with a space
  const CHUNK = 74;
  let out = '';
  let i = 0;
  while (i < line.length) {
    out += (i === 0 ? '' : '\r\n ') + line.slice(i, i + CHUNK);
    i += CHUNK;
  }
  return out;
}

let photoBlock = '';
const photoPath = path.join(root, 'assets', data.photo || '');
if (data.photo && fs.existsSync(photoPath)) {
  const b64 = fs.readFileSync(photoPath).toString('base64');
  photoBlock = foldLine(`PHOTO;ENCODING=b;TYPE=JPEG:${b64}`) + '\r\n';
}

const vcfLines = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  `N:${data.lastName};${data.firstName};;;`,
  `FN:${data.fullName}`,
  `ORG:${data.company}`,
  `TITLE:${data.jobTitle}`,
  data.phone ? `TEL;TYPE=CELL,VOICE:${data.phone}` : null,
  `EMAIL;TYPE=WORK:${data.workEmail}`,
  data.linkedinUrl ? `URL;TYPE=LinkedIn:${data.linkedinUrl}` : null,
  data.aboutMe ? `NOTE:${data.aboutMe.replace(/,/g, '\\,')}` : null,
  'END:VCARD',
].filter(Boolean).join('\r\n') + '\r\n';

const vcfWithPhoto = photoBlock
  ? vcfLines.replace('END:VCARD', photoBlock + 'END:VCARD')
  : vcfLines;

const vcfFile = `${data.slug}.vcf`;
fs.writeFileSync(path.join(outDir, vcfFile), vcfWithPhoto);

// ---- HTML ----
let tpl = fs.readFileSync(path.join(root, 'template', 'card.html'), 'utf8');

const logoCandidates = ['tspi-logo.webp', 'tspi-logo.png', 'tspi-logo.svg'];
const logoName = logoCandidates.find(name => fs.existsSync(path.join(root, 'assets', name)));
const hasLogo = !!logoName;
const logoPath = hasLogo ? path.join(root, 'assets', logoName) : null;
const hasPhoto = !!(data.photo && fs.existsSync(photoPath));

const ctx = {
  ...data,
  vcfFile,
  hasLogo,
  logoFile: logoName,
  hasPhoto,
};

// minimal mustache-like renderer: {{#key}}...{{/key}}, {{^key}}...{{/key}}, {{key}}
function render(template, ctx) {
  template = template.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (_, key, inner) =>
    ctx[key] ? inner : ''
  );
  template = template.replace(/{{\^(\w+)}}([\s\S]*?){{\/\1}}/g, (_, key, inner) =>
    !ctx[key] ? inner : ''
  );
  template = template.replace(/{{(\w+)}}/g, (_, key) =>
    ctx[key] !== undefined && ctx[key] !== null ? ctx[key] : ''
  );
  return template;
}

const html = render(tpl, ctx);
fs.writeFileSync(path.join(outDir, 'index.html'), html);

// ---- copy static assets ----
if (hasPhoto) fs.copyFileSync(photoPath, path.join(outDir, data.photo));
if (hasLogo) fs.copyFileSync(logoPath, path.join(outDir, logoName));

console.log(`Built dist/${data.slug}/index.html (+ ${vcfFile}${hasLogo ? '' : ', using text wordmark — no logo file found'})`);

// ---- QR home-screen tile (add-to-home-screen mini app showing the branded QR full screen) ----
const markPath = path.join(root, 'assets', 'tspi-mark.png');
const qrOutDir = path.join(outDir, 'qr');
fs.mkdirSync(qrOutDir, { recursive: true });

if (!data.pageUrl) {
  console.warn('No pageUrl in data file — QR will encode an empty/placeholder link.');
}

// Full logo (with wordmark + tagline) in the QR center, sized to its real aspect ratio
const qrLogoPath = hasLogo ? logoPath : (fs.existsSync(markPath) ? markPath : null);
const qrLogoAspect = hasLogo ? 4831 / 2045 : 1;
const qrSvg = generateBrandedQrSvg(data.pageUrl || '', qrLogoPath, { logoAspect: qrLogoAspect });
fs.writeFileSync(path.join(qrOutDir, 'qr.svg'), qrSvg);

const tileTpl = fs.readFileSync(path.join(root, 'template', 'qr-tile.html'), 'utf8');
fs.writeFileSync(path.join(qrOutDir, 'index.html'), render(tileTpl, ctx));

// Absolute URLs, not relative ones — iOS Safari has a known bug where relative
// start_url/scope in a manifest sometimes resolve against the site root instead
// of the manifest's own folder, sending the home-screen tile to the wrong page.
const qrDirUrl = data.pageUrl ? data.pageUrl.replace(/[^/]*$/, '') + 'qr/' : 'qr/';
const manifest = {
  name: `${data.fullName} — Contact QR`,
  short_name: `${data.firstName} QR`,
  start_url: `${qrDirUrl}index.html`,
  scope: qrDirUrl,
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#ffffff',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
};
fs.writeFileSync(path.join(qrOutDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

if (fs.existsSync(markPath)) {
  execFileSync('python3', [path.join(root, 'generate-icons.py'), markPath, qrOutDir]);
} else {
  console.warn('No assets/tspi-mark.png found — skipping home-screen icon generation.');
}

console.log(`Built dist/${data.slug}/qr/index.html (home-screen QR tile)`);
