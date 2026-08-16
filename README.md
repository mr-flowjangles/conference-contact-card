# Conference Contact Card

Repo: https://github.com/mr-flowjangles/conference-contact-card

A mobile contact card + QR code. Scan it, land on a page with photo and
title, tap **Save Contact**, it drops into the phone's Contacts app.
Everyone's card is hosted on their own site (`robrose.info/card` for Rob) —
nothing shared, nothing public-facing collects data.

## Get people added (internal spreadsheet import)

1. Share an internal spreadsheet (Google Sheets, Excel, whatever) with these
   columns: `fullName, jobTitle, workEmail, phone, linkedinUrl, aboutMe, photoUrl`.
   `phone` and `photoUrl` can be blank. `photoUrl` is a link to their headshot.
2. Have people fill in a row each.
3. Export the sheet as CSV.
4. Run:
   ```bash
   node scripts/import-csv.js people.csv --base-url https://robrose.info/card
   ```
   This creates a `data/<slug>.json` per row and downloads each photo into
   `assets/`.
5. For each new person:
   ```bash
   node build.js data/<slug>.json
   ```
6. Deploy `dist/<slug>/` to wherever `pageUrl` says it lives (see below).

Nothing here is public or open to the internet — it only runs when you run it.

## Build locally

Requires Node.js and `rsvg-convert` (`brew install librsvg`). Image resizing
uses `sips`, which ships with macOS.

```bash
node build.js data/<name>.json
```

Outputs to `dist/<name>/`: the card page, the vCard, a `qr/` folder (QR as
`.svg`, `.png`, and a fullscreen home-screen tile page), and — when signing
certs are configured — `<name>.pkpass` for Apple Wallet.

## Deploying

Everything in `dist/<name>/` is static — upload it to S3, Netlify, your own
host, wherever. `pageUrl` in the data file must match the real destination
*before* you build, since it's baked into the QR code and the tile's manifest.

Rob's deploy (S3 + CloudFront):
```bash
aws s3 sync dist/<name>/ s3://<bucket>/card/
aws cloudfront create-invalidation --distribution-id <id> --paths "/card/*"
```

## Apple Wallet pass

The pass is a `generic` PassKit pass: name, title, company and the branded QR
on the front, tap-to-call / tap-to-mail / booking link on the back. The QR
encodes the same `pageUrl` as the web one, so scanning the phone screen lands
on the card page.

`barcodeStyle` in `pass-config.json` picks how the QR gets there:

- **`branded`** (default) — the same QR the website shows, rounded dots and
  logo in the middle, placed in the pass's thumbnail slot. Identical artwork
  everywhere. Costs: it's capped at 90x90pt (the only square image slot a pass
  has), it takes the headshot's place, and because Wallet doesn't know it's a
  barcode the screen won't auto-brighten when the pass opens.
- **`native`** — Wallet's own `barcodes` field. Plain black-and-white square
  with no logo, rendered larger across the bottom, with auto-brightness. The
  headshot keeps the thumbnail slot.

The two are mutually exclusive — running both would put two different-looking
QRs on one pass.

Signing needs a Pass Type ID certificate — an Apple Developer account issues
it, one time. Everything in `certs/` is gitignored.

1. The key and CSR are already generated (`certs/pass-key.pem`,
   `certs/pass.csr`). To regenerate:
   ```bash
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout certs/pass-key.pem -out certs/pass.csr -subj "/CN=Rob Rose/C=US"
   ```
   The subject is cosmetic — Apple issues the cert with its own.
2. Create a **Pass Type ID** at developer.apple.com → Certificates, Identifiers
   & Profiles → Identifiers → **Pass Type IDs**. Use `pass.info.robrose.card`,
   or change `passTypeIdentifier` in `pass-config.json` to match what you make.
3. Create a certificate for that Pass Type ID, upload `certs/pass.csr`, and
   download the resulting `.cer`. Convert it:
   ```bash
   openssl x509 -inform DER -in ~/Downloads/pass.cer -out certs/pass-cert.pem
   ```
4. Apple's intermediate is already fetched (`certs/wwdr.pem`, WWDR G4, valid to
   Dec 2030). To refresh:
   ```bash
   curl -o certs/AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
   openssl x509 -inform DER -in certs/AppleWWDRCAG4.cer -out certs/wwdr.pem
   ```
5. Put your 10-character Team ID (developer.apple.com → Membership) into
   `teamIdentifier` in `pass-config.json`.

Then the normal build signs automatically:

```bash
node build.js data/rob-rose.json
```

That writes `dist/<slug>/<slug>.pkpass` and adds an **Add to Apple Wallet**
button to the card page. Without the certs the build still runs — it writes the
unsigned bundle to `dist/<slug>/pass/` and leaves the button off, since an
unsigned pass won't install.

A Keychain-exported `.p12` works too, if you'd rather go that route:
`PASS_CERT=certs/pass.p12 PASS_CERT_PASSWORD='...' node build.js data/…`.

### Previewing in the Simulator

```bash
python3 -m http.server --directory dist/rob-rose 8787   # needs the pkpass MIME type
xcrun simctl openurl booted "http://127.0.0.1:8787/rob-rose.pkpass"
```

Wallet validates the signature in the Simulator exactly as on device, so an
unsigned pass is fetched and then silently dropped — no Add sheet, no error.

`deploy.sh` uploads the `.pkpass` with `Content-Type:
application/vnd.apple.pkpass`; served as anything else, tapping the button
downloads a dead file instead of opening Wallet.

Optional: add `passLocations` to a data file (`[{ "latitude": …, "longitude": …,
"relevantText": "…" }]`) and the pass surfaces on the lock screen at that venue.

## Get a QR onto a phone as a home-screen tile

1. Open `<pageUrl-folder>/qr/index.html` in Safari on the phone.
2. Tap Share.
3. Tap Add to Home Screen.
4. Tap the new icon — QR shows fullscreen.

## Files

- `data/<name>.json` — one person's info
- `assets/` — logo + headshots
- `template/card.html` — the card page template
- `template/qr-tile.html` — the fullscreen QR tile template
- `lib/qr-brand.js` — QR generator (rounded dots, logo in center, circular frame)
- `lib/pass-images.js` — sips-based image sizing for the pass and tile icons
- `build.js` — builds `dist/<name>/` from template + data
- `scripts/import-csv.js` — turns a spreadsheet export into `data/*.json`
- `scripts/build-pass.js` — builds and signs the Apple Wallet pass
- `pass-config.json` — Pass Type ID, Team ID, and pass colors
