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

Requires Node.js, Python 3 + Pillow (`pip install Pillow`), and
`rsvg-convert` (`brew install librsvg`).

```bash
node build.js data/<name>.json
```

Outputs to `dist/<name>/`: the card page, the vCard, and a `qr/` folder
(QR as `.svg`, `.png`, and a fullscreen home-screen tile page).

## Deploying

Everything in `dist/<name>/` is static — upload it to S3, Netlify, your own
host, wherever. `pageUrl` in the data file must match the real destination
*before* you build, since it's baked into the QR code and the tile's manifest.

Rob's deploy (S3 + CloudFront):
```bash
aws s3 sync dist/<name>/ s3://<bucket>/card/
aws cloudfront create-invalidation --distribution-id <id> --paths "/card/*"
```

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
- `build.js` — builds `dist/<name>/` from template + data
- `scripts/import-csv.js` — turns a spreadsheet export into `data/*.json`
