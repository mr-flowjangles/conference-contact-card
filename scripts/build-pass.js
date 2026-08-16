#!/usr/bin/env node
// Builds an Apple Wallet pass from data/<slug>.json.
// Usage: node scripts/build-pass.js data/rob-rose.json
//
// Unsigned by default. To produce an installable .pkpass, set:
//   PASS_CERT=/path/to/pass.p12  PASS_CERT_PASSWORD=...  (and certs/wwdr.pem)
// Without those it still writes the raw bundle so you can inspect it.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { buildPassImages } = require('../lib/pass-images');
const { generateBrandedQrSvg } = require('../lib/qr-brand');

const root = path.join(__dirname, '..');

function buildPass(dataPath, { quiet = false } = {}) {
  const log = msg => { if (!quiet) console.log(msg); };
  const warn = msg => console.warn(msg);

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const configPath = path.join(root, 'pass-config.json');
  if (!fs.existsSync(configPath)) {
    warn('No pass-config.json — skipping Wallet pass.');
    return null;
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!data.pageUrl) {
    warn('No pageUrl in data file — skipping Wallet pass (the QR would encode nothing).');
    return null;
  }

  const outDir = path.join(root, 'dist', data.slug);
  const bundleDir = path.join(outDir, 'pass');
  fs.rmSync(bundleDir, { recursive: true, force: true });
  fs.mkdirSync(bundleDir, { recursive: true });

  // ---- images ----
  const assets = path.join(root, 'assets');
  const firstExisting = names => names.map(n => path.join(assets, n)).find(p => fs.existsSync(p)) || null;
  const markPath = firstExisting(['tspi-mark.png']);
  const logoPath = firstExisting(['tspi-logo.webp', 'tspi-logo.png', 'tspi-logo.svg']);
  const photoPath = data.photo && fs.existsSync(path.join(assets, data.photo))
    ? path.join(assets, data.photo)
    : null;

  // "branded" puts the same QR the website uses — rounded dots, logo in the
  // middle — into the thumbnail slot. Wallet generates its own plain barcode
  // from the `barcodes` field and gives no way to restyle it, so the branded
  // one has to ride as an image instead, and the two are mutually exclusive:
  // showing both would put two different-looking QRs on one pass.
  const barcodeStyle = config.barcodeStyle || 'branded';
  const brandedQr = barcodeStyle === 'branded'
    ? renderBrandedQrPng(data, { logoPath, markPath, outDir: bundleDir })
    : null;

  buildPassImages({
    markPath,
    logoPath,
    // The thumbnail is the only square image slot on a pass, so the QR takes
    // the headshot's place. The photo still leads the card page and the vCard.
    photoPath: brandedQr || photoPath,
    outDir: bundleDir,
  });

  // ---- pass.json ----
  // Back fields carry the things a QR can't: tap-to-call, tap-to-mail, the
  // booking link. attributedValue renders real anchors; value is the plain
  // fallback for anything that doesn't parse HTML.
  const backFields = [];
  // attributedValue is parsed as HTML, so a query string full of raw & (the
  // Outlook booking link has several) has to be escaped or the href truncates.
  const escapeHtml = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const pushBack = (key, label, value, href) => {
    if (!value) return;
    const field = { key, label, value };
    if (href) field.attributedValue = `<a href="${escapeHtml(href)}">${escapeHtml(value)}</a>`;
    backFields.push(field);
  };

  pushBack('email', 'Email', data.workEmail, `mailto:${data.workEmail}`);
  pushBack('phone', 'Mobile', data.phone, data.phone ? `tel:${String(data.phone).replace(/[^\d+]/g, '')}` : null);
  pushBack('linkedin', 'LinkedIn', data.linkedinUrl, data.linkedinUrl);
  pushBack('booking', 'Schedule Time', data.bookingUrl ? 'Book a meeting' : null, data.bookingUrl);
  pushBack('card', 'Contact Card', data.pageUrl, data.pageUrl);
  if (Array.isArray(data.credentials) && data.credentials.length) {
    backFields.push({ key: 'credentials', label: 'Focus', value: data.credentials.join('\n') });
  }
  pushBack('about', 'About', data.aboutMe);

  const pass = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    organizationName: config.organizationName || data.company,
    serialNumber: data.slug,
    description: `${data.fullName} — ${data.company} contact card`,
    logoText: data.company,
    backgroundColor: config.backgroundColor,
    foregroundColor: config.foregroundColor,
    labelColor: config.labelColor,
    sharingProhibited: false,
    generic: {
      headerFields: [],
      primaryFields: [{ key: 'name', label: '', value: data.fullName }],
      secondaryFields: [{ key: 'title', label: 'Title', value: data.jobTitle }],
      auxiliaryFields: [{ key: 'company', label: 'Company', value: data.company }],
      backFields,
    },
  };

  if (!brandedQr) {
    pass.barcodes = [
      {
        format: 'PKBarcodeFormatQR',
        message: data.pageUrl,
        messageEncoding: 'iso-8859-1',
        altText: data.pageUrl.replace(/^https?:\/\//, '').replace(/\/index\.html$/, ''),
      },
    ];
  }

  // Optional: surface the pass on the lock screen at a venue.
  // data.passLocations = [{ latitude, longitude, relevantText }]
  if (Array.isArray(data.passLocations) && data.passLocations.length) {
    pass.locations = data.passLocations.slice(0, 10);
    pass.maxDistance = data.passMaxDistance || 500;
  }

  fs.writeFileSync(path.join(bundleDir, 'pass.json'), JSON.stringify(pass, null, 2));

  // ---- manifest.json: SHA-1 of every file in the bundle ----
  const manifest = {};
  for (const name of fs.readdirSync(bundleDir).sort()) {
    if (name === 'manifest.json' || name === 'signature') continue;
    const buf = fs.readFileSync(path.join(bundleDir, name));
    manifest[name] = crypto.createHash('sha1').update(buf).digest('hex');
  }
  fs.writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  log(`Built dist/${data.slug}/pass/ (${Object.keys(manifest).length} files)`);

  // ---- signature ----
  const signed = signManifest(bundleDir, warn);
  if (!signed) {
    warn('Pass is unsigned — see README "Apple Wallet pass" for the certificate steps.');
    return { bundleDir, pkpass: null };
  }

  // ---- zip to .pkpass ----
  const pkpass = path.join(outDir, `${data.slug}.pkpass`);
  fs.rmSync(pkpass, { force: true });
  // -X drops the macOS extended attributes that make Wallet reject the archive
  execFileSync('zip', ['-q', '-r', '-X', pkpass, '.'], { cwd: bundleDir });
  log(`Built dist/${data.slug}/${data.slug}.pkpass (signed)`);

  return { bundleDir, pkpass };
}

// Renders the branded QR to a PNG big enough to fill the @3x thumbnail (270px).
// Staged outside the bundle — anything left in there gets hashed into the
// manifest and shipped.
function renderBrandedQrPng(data, { logoPath, markPath }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pass-qr-'));
  const svgPath = path.join(tmp, 'qr.svg');
  const pngPath = path.join(tmp, 'qr.png');

  const qrLogo = logoPath || (markPath && fs.existsSync(markPath) ? markPath : null);
  const logoAspect = logoPath ? 4831 / 2045 : 1;
  fs.writeFileSync(svgPath, generateBrandedQrSvg(data.pageUrl, qrLogo, { logoAspect }));

  try {
    execFileSync('rsvg-convert', ['-w', '540', '-h', '540', svgPath, '-o', pngPath], { stdio: 'pipe' });
    return pngPath;
  } catch {
    console.warn('rsvg-convert not found — pass falls back to Wallet\'s plain barcode.');
    return null;
  }
}

// Detached PKCS#7 signature over manifest.json, per Apple's PassKit spec.
function signManifest(bundleDir, warn) {
  const certs = path.join(root, 'certs');
  const wwdr = path.join(certs, 'wwdr.pem');

  if (!fs.existsSync(wwdr)) {
    warn('Missing certs/wwdr.pem — see README "Apple Wallet pass".');
    return false;
  }

  // Preferred path: the PEM pair straight from the CSR flow, no PKCS#12 detour.
  const pemCert = path.join(certs, 'pass-cert.pem');
  const pemKey = path.join(certs, 'pass-key.pem');
  if (fs.existsSync(pemCert) && fs.existsSync(pemKey)) {
    return smimeSign(bundleDir, wwdr, pemCert, pemKey, warn);
  }

  const p12 = process.env.PASS_CERT;
  const password = process.env.PASS_CERT_PASSWORD || '';
  if (!p12) return false;
  if (!fs.existsSync(p12)) {
    warn(`PASS_CERT points at ${p12}, which does not exist.`);
    return false;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pkpass-'));
  fs.chmodSync(tmp, 0o700);
  const certPem = path.join(tmp, 'cert.pem');
  const keyPem = path.join(tmp, 'key.pem');

  try {
    // OpenSSL 3 rejects Keychain's older PKCS#12 encryption without -legacy,
    // but -legacy fails on newer exports, so try modern first.
    const extract = legacy => {
      const base = ['pkcs12', '-in', p12, '-passin', `pass:${password}`];
      const flags = legacy ? ['-legacy'] : [];
      execFileSync('openssl', [...base, '-clcerts', '-nokeys', '-out', certPem, ...flags], { stdio: 'pipe' });
      execFileSync('openssl', [...base, '-nocerts', '-nodes', '-out', keyPem, ...flags], { stdio: 'pipe' });
    };
    try {
      extract(false);
    } catch {
      extract(true);
    }

    return smimeSign(bundleDir, wwdr, certPem, keyPem, warn);
  } catch (err) {
    warn(`Signing failed: ${err.stderr ? err.stderr.toString().trim() : err.message}`);
    return false;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function smimeSign(bundleDir, wwdr, certPem, keyPem, warn) {
  try {
    execFileSync('openssl', [
      'smime', '-binary', '-sign',
      '-certfile', wwdr,
      '-signer', certPem,
      '-inkey', keyPem,
      '-in', path.join(bundleDir, 'manifest.json'),
      '-out', path.join(bundleDir, 'signature'),
      '-outform', 'DER',
    ], { stdio: 'pipe' });
    return true;
  } catch (err) {
    warn(`Signing failed: ${err.stderr ? err.stderr.toString().trim() : err.message}`);
    return false;
  }
}

module.exports = { buildPass };

if (require.main === module) {
  const dataPath = process.argv[2];
  if (!dataPath) {
    console.error('Usage: node scripts/build-pass.js data/<person>.json');
    process.exit(1);
  }
  buildPass(dataPath);
}
