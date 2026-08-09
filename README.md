# Conference Contact Card

A mobile contact card + QR code system. Scan the code, land on a page with your
photo, title, and a "Save Contact" button that drops a real vCard into the
phone's Contacts app — no app, account, or sign-up on either side.

One shared template, one data file per person. Everyone's card is built and
hosted from this same repo — nobody needs their own website, domain, or
hosting account.

## Get your own card (no hosting needed)

1. **Add your photo** to `assets/` (e.g. `assets/jane-doe.jpg`).

2. **Copy `data/rob-rose.json`** to `data/<your-slug>.json` and fill in your
   own details:

   ```json
   {
     "slug": "jane-doe",
     "fullName": "Jane Doe",
     "firstName": "Jane",
     "lastName": "Doe",
     "jobTitle": "Your Title",
     "company": "TSPi",
     "companyUrl": "https://tspi.net",
     "workEmail": "jane.doe@tspi.net",
     "phone": "555-555-5555",
     "linkedinUrl": "https://www.linkedin.com/in/yourprofile",
     "aboutMe": "One or two sentences about what you do.",
     "photo": "jane-doe.jpg",
     "pageUrl": "https://mr-flowjangles.github.io/conference-contact-card/jane-doe/index.html"
   }
   ```

   `pageUrl` is what the QR code encodes, so it has to be the real URL your
   card ends up at. If you're adding your card to *this* repo (not a fork),
   that's always `https://mr-flowjangles.github.io/conference-contact-card/<your-slug>/index.html`.

   `phone` and `photo` are optional — drop them from the JSON to omit both
   the button and the image.

3. **Get it into the repo**, either:
   - Ask to be added as a collaborator and push your two files directly, or
   - Open a pull request with your `data/<slug>.json` + `assets/<photo>.jpg`
     for the repo owner to merge.

4. **Wait for the build.** Once your files land on `master`, GitHub Actions
   automatically builds a card for every file in `data/*.json` and deploys
   them all. Check the repo's **Actions** tab — usually done in under a
   minute. Your card is then live at:

   ```
   https://mr-flowjangles.github.io/conference-contact-card/<your-slug>/index.html
   ```

## Where your QR code actually is

Everything under `<your-slug>/qr/` is about the QR code specifically:

| What you want | URL |
|---|---|
| Printable image (badge, slide) | `.../<your-slug>/qr/qr.png` |
| Vector version | `.../<your-slug>/qr/qr.svg` |
| Fullscreen QR page (for a home-screen tile) | `.../<your-slug>/qr/index.html` |

For the phone-tile version: open the `qr/index.html` link above on your
phone, tap Share → **Add to Home Screen**. Tapping the new icon shows your QR
fullscreen, no browser bar — that's what you hold up for people to scan.

## What people experience when they scan it

1. They scan your QR (off your home-screen tile, a printed badge, a slide —
   wherever you display it).
2. It opens your card page: photo, name, title, about-me blurb.
3. They tap **Save Contact** → their phone prompts "Add to Contacts" with
   your name, title, company, phone, email, LinkedIn, and photo all filled in.
4. Or they tap **LinkedIn** / **Email me** / **Call** directly.

## Want your own independent copy instead?

Fork the repo, enable Pages on your fork (Settings → Pages → Source: **GitHub
Actions**), and point `pageUrl` at your own `<your-username>.github.io/<repo>/...`
instead. Useful if you want full control rather than adding your card to the
shared one.

## Building locally

Requires Node.js, Python 3 with Pillow (`pip install Pillow`) for icon
generation, and `rsvg-convert` (`brew install librsvg`) for the printable
`qr.png`.

```bash
node build.js data/<your-slug>.json
```

Outputs to `dist/<your-slug>/` — the card, the vCard, and the `qr/` folder
described above. Open `dist/<your-slug>/index.html` in a browser to preview.

## Hosting somewhere other than GitHub Pages

Everything in `dist/<your-slug>/` is static — upload it to S3, Netlify,
Vercel, wherever. Just make sure `pageUrl` in your data file matches the real
URL *before* you build, since it's baked into the QR code and the manifest.

## How it's put together

```
data/<slug>.json     — one person's info (the only thing most people edit)
assets/               — shared logo + individual headshots
template/card.html    — the shared page template (all cards use this)
template/qr-tile.html — the fullscreen home-screen QR page template
lib/qr-brand.js       — generates the branded, scan-verified QR (rounded
                         dots, logo in the center, circular frame)
build.js              — renders template + data → dist/<slug>/, including
                         qr.svg and qr.png
.github/workflows/    — auto-builds + deploys every data/*.json on push
```

The QR is regenerated at build time with high error-correction (so the logo
in the center doesn't break scanning) and is safe to re-theme in
`lib/qr-brand.js` if you want different colors or a different logo shape.
