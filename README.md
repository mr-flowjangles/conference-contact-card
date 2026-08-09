# Conference Contact Card

Repo: https://github.com/mr-flowjangles/conference-contact-card

## Want your own card?

1. Send to the repo owner: name, job title, work email, phone (optional),
   LinkedIn link, headshot photo, one-line "about me."
2. Wait for your link + QR code back.

Done. No GitHub needed.

## Maintainer: add a new person

1. Copy `data/rob-rose.json` to `data/<name>.json`.
2. Fill in their details in that file.
3. Add their photo to `assets/`.
4. Set `pageUrl` to `https://mr-flowjangles.github.io/conference-contact-card/<name>/index.html`.
5. Push to `master`.
6. Check the **Actions** tab until it's green.
7. Send them their link and their QR image:
   - Link: `https://mr-flowjangles.github.io/conference-contact-card/<name>/index.html`
   - QR: `https://mr-flowjangles.github.io/conference-contact-card/<name>/qr/qr.png`

## Maintainer: build locally

1. Install Node.js.
2. Install Python 3 + Pillow: `pip install Pillow`.
3. Install rsvg-convert: `brew install librsvg`.
4. Run `node build.js data/<name>.json`.
5. Open `dist/<name>/index.html` to preview.

## Maintainer: get someone's QR onto a phone as a home-screen tile

1. Open `https://mr-flowjangles.github.io/conference-contact-card/<name>/qr/index.html` in Safari on the phone.
2. Tap Share.
3. Tap Add to Home Screen.
4. Tap the new icon — QR shows fullscreen.

## Files

- `data/<name>.json` — one person's info
- `assets/` — logo + headshots
- `template/card.html` — the card page template
- `template/qr-tile.html` — the fullscreen QR tile template
- `lib/qr-brand.js` — QR generator
- `build.js` — builds `dist/<name>/` from template + data
- `.github/workflows/` — auto-builds + deploys on push
