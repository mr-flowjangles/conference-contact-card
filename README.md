# Conference Contact Card

A mobile contact card + QR code. Scan it, land on a page with your photo and
title, tap **Save Contact**, and it drops straight into the phone's Contacts
app — no app, account, or sign-up needed.

## Want your own card?

Send these to whoever's running this repo for you:

- Your name, job title, work email
- LinkedIn link
- Phone number (optional)
- A headshot photo
- One or two sentences about what you do

You'll get back a link and a QR code. That's the whole process — you don't
need GitHub, Git, or anything technical.

---

## For whoever's maintaining the repo

Adding someone:

1. Copy `data/rob-rose.json` to `data/<their-name>.json` (lowercase, dash
   instead of space — e.g. `data/jane-doe.json`) and fill in their details.
2. Add their photo to `assets/`.
3. Set `pageUrl` in their file to
   `https://mr-flowjangles.github.io/conference-contact-card/<their-name>/index.html`.
4. Push to `master`. GitHub Actions builds and deploys it automatically —
   check the **Actions** tab, usually done in under a minute.
5. Send them their link:
   `https://mr-flowjangles.github.io/conference-contact-card/<their-name>/index.html`
   and their QR image:
   `https://mr-flowjangles.github.io/conference-contact-card/<their-name>/qr/qr.png`

### Getting a QR onto your own phone as a home-screen tile

Open `.../<their-name>/qr/index.html` on the phone in Safari, Share → **Add
to Home Screen**. Tapping the icon shows the QR fullscreen, no browser bar —
that's what you hold up for people to scan.

### Building locally

Requires Node.js, Python 3 with Pillow (`pip install Pillow`), and
`rsvg-convert` (`brew install librsvg`).

```bash
node build.js data/<their-name>.json
```

Outputs to `dist/<their-name>/` — the card, the vCard, and the `qr/` folder
(QR as `.svg`, `.png`, and a fullscreen tile page). Open
`dist/<their-name>/index.html` in a browser to preview before pushing.

### How it's put together

```
data/<name>.json      — one person's info
assets/                — shared logo + individual headshots
template/card.html     — the shared page template
template/qr-tile.html  — the fullscreen home-screen QR page template
lib/qr-brand.js        — generates the branded, scan-verified QR
build.js               — renders template + data → dist/<name>/
.github/workflows/     — auto-builds + deploys every data/*.json on push
```

### Hosting somewhere other than GitHub Pages

Everything in `dist/<name>/` is static — upload it anywhere. Just set
`pageUrl` to the real destination URL *before* building, since it's baked
into the QR code.
