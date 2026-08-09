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

## If you're technical and want to do it yourself

1. Fork this repo.
2. Enable Pages on your fork — Settings → Pages → Source: **GitHub Actions**.
3. Copy `data/rob-rose.json` to `data/<your-name>.json` and fill it in.
4. Add your photo to `assets/`.
5. Set `pageUrl` to `https://<your-github-username>.github.io/<repo-name>/<your-name>/index.html`.
6. Push to `master`.
7. Check the **Actions** tab until it's green.

## Build locally

1. Install Node.js.
2. Install Python 3 + Pillow: `pip install Pillow`.
3. Install rsvg-convert: `brew install librsvg`.
4. Run `node build.js data/<name>.json`.
5. Open `dist/<name>/index.html` to preview.

## Get a QR onto a phone as a home-screen tile

1. Open `.../<name>/qr/index.html` in Safari on the phone.
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
