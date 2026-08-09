# Conference Contact Card

Repo: https://github.com/mr-flowjangles/conference-contact-card

## Want your own card?

1. Clone or fork this repo.
2. Copy `data/rob-rose.json` to `data/<your-name>.json`.
3. Fill in your details in that file.
4. Add your photo to `assets/`.
5. Set `pageUrl` in your file to your GitHub Pages URL:
   `https://<your-github-username>.github.io/<repo-name>/<your-name>/index.html`
6. If you forked: enable Pages on your fork — Settings → Pages → Source:
   **GitHub Actions**.
7. Push to `master`.
8. Check the **Actions** tab until it's green.
9. Your card, link, and QR are now live:
   - Link: `.../<your-name>/index.html`
   - QR: `.../<your-name>/qr/qr.png`

## Build locally

1. Install Node.js.
2. Install Python 3 + Pillow: `pip install Pillow`.
3. Install rsvg-convert: `brew install librsvg`.
4. Run `node build.js data/<your-name>.json`.
5. Open `dist/<your-name>/index.html` to preview.

## Get your QR onto your phone as a home-screen tile

1. Open `.../<your-name>/qr/index.html` in Safari on your phone.
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
