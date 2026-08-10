#!/usr/bin/env node
// Turns a CSV export (from whatever spreadsheet you already use — Google
// Sheets, Excel, anything) into a data/<slug>.json per row.
//
// Usage:
//   node scripts/import-csv.js people.csv --base-url https://robrose.info/card
//
// Expected header columns (any order):
//   fullName, jobTitle, workEmail, phone, linkedinUrl, aboutMe, photoUrl
// Optional columns: company, companyUrl (default to TSPi if omitted)
//
// photoUrl is downloaded into assets/<slug>.jpg. Everything else is written
// straight into data/<slug>.json in the same shape build.js expects.

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');

const args = process.argv.slice(2);
const csvPath = args[0];
const baseUrlFlagIndex = args.indexOf('--base-url');
const baseUrl = baseUrlFlagIndex !== -1 ? args[baseUrlFlagIndex + 1] : null;

if (!csvPath) {
  console.error('Usage: node scripts/import-csv.js <people.csv> [--base-url https://your-site.com/card]');
  process.exit(1);
}
if (!baseUrl) {
  console.error('Missing --base-url — e.g. --base-url https://robrose.info/card');
  process.exit(1);
}

// Minimal RFC4180 CSV parser: handles quoted fields, embedded commas, "" escapes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  text = text.replace(/\r\n/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function slugify(fullName) {
  return fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts.length > 1 ? parts.pop() : '';
  return { firstName: parts.join(' '), lastName };
}

function downloadPhoto(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadPhoto(res.headers.location, destPath).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function main() {
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error('No data rows found in CSV.');
    process.exit(1);
  }

  const header = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1);

  const results = [];

  for (const row of dataRows) {
    const rec = {};
    header.forEach((key, i) => { rec[key] = (row[i] || '').trim(); });

    if (!rec.fullName) {
      results.push({ ok: false, error: 'missing fullName', row: rec });
      continue;
    }

    const slug = slugify(rec.fullName);
    const { firstName, lastName } = splitName(rec.fullName);

    let photoFile = null;
    if (rec.photoUrl) {
      photoFile = `${slug}.jpg`;
      try {
        await downloadPhoto(rec.photoUrl, path.join(root, 'assets', photoFile));
      } catch (err) {
        console.warn(`  [${slug}] photo download failed (${err.message}) — add assets/${photoFile} manually.`);
      }
    }

    const data = {
      slug,
      fullName: rec.fullName,
      firstName,
      lastName,
      jobTitle: rec.jobTitle || '',
      company: rec.company || 'TSPi',
      companyUrl: rec.companyUrl || 'https://tspi.net',
      workEmail: rec.workEmail || '',
      ...(rec.phone ? { phone: rec.phone } : {}),
      linkedinUrl: rec.linkedinUrl || '',
      aboutMe: rec.aboutMe || '',
      ...(photoFile ? { photo: photoFile } : {}),
      pageUrl: `${baseUrl.replace(/\/$/, '')}/${slug}/index.html`,
    };

    fs.writeFileSync(
      path.join(root, 'data', `${slug}.json`),
      JSON.stringify(data, null, 2) + '\n'
    );

    try {
      execFileSync('node', [path.join(root, 'build.js'), path.join(root, 'data', `${slug}.json`)], { stdio: 'pipe' });
      results.push({ ok: true, slug });
    } catch (err) {
      results.push({ ok: false, row: rec, error: `build failed: ${err.message}` });
    }
  }

  console.log('\nDone:');
  for (const r of results) {
    console.log(r.ok ? `  ✓ ${r.slug} → dist/${r.slug}/` : `  ✗ ${r.row.fullName || '(unknown)'}: ${r.error}`);
  }
  console.log(`\nDeploy the dist/<slug>/ folders to wherever each pageUrl points.`);
}

main();
