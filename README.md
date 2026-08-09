# Conference Contact Card

A mobile contact card + QR code system. Scan the code, land on a page with your
photo, title, and a "Save Contact" button that drops a real vCard into the
phone's Contacts app — no app, account, or sign-up on either side.

One shared template, one data file per person. Add your info, push, and
GitHub Pages hosts your own card automatically.

## Get your own card (5 minutes)

1. **Fork this repo.**

2. **Enable Pages on your fork:** Settings → Pages → Build and deployment →
   Source: **GitHub Actions**. (Only needed once per fork.)

3. **Add your photo** to `assets/` (e.g. `assets/jane-doe.jpg`).

4. **Copy `data/rob-rose.json`** to `data/<your-slug>.json` and fill in your
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
     "pageUrl": "https://<your-github-username>.github.io/<repo-name>/jane-doe/index.html"
   }
   ```

   `pageUrl` is what the QR code encodes — it must match wherever this ends up
   hosted (your GitHub Pages URL by default; see below if you're hosting
   elsewhere).

5. **Push to `master`.** GitHub Actions builds a card for every file in
   `data/*.json` and deploys them all to Pages. Your card shows up at:

   ```
   https://<your-github-username>.github.io/<repo-name>/<your-slug>/index.html
   ```

   Check the **Actions** tab if it doesn't show up after a minute or two.

6. **Get your QR code:** open
   `https://<your-username>.github.io/<repo-name>/<your-slug>/qr/index.html`
   on your phone in Safari/Chrome, then Share → **Add to Home Screen**. Tapping
   the new icon shows your QR code fullscreen — that's what people scan.

`phone` and `photo` are optional; drop them from the JSON to omit both the
button and the image.

## What people actually experience

1. They scan your QR (off your home-screen tile, a printed badge, a slide —
   wherever you display it).
2. It opens your card page: photo, name, title, about-me blurb.
3. They tap **Save Contact** → their phone prompts "Add to Contacts" with
   your name, title, company, phone, email, LinkedIn, and photo all filled in.
4. Or they tap **LinkedIn** / **Email me** / **Call** directly.

## Building locally

Requires Node.js and Python 3 with Pillow (`pip install Pillow`) for icon
generation.

```bash
node build.js data/<your-slug>.json
```

Outputs to `dist/<your-slug>/` — the card, the vCard, and a `qr/` subfolder
with the home-screen QR tile page (manifest + icons included). Open
`dist/<your-slug>/index.html` in a browser to preview.

## Hosting somewhere other than GitHub Pages

Everything in `dist/<your-slug>/` is static — upload it to S3, Netlify,
Vercel, wherever. Just make sure `pageUrl` in your data file matches the real
URL *before* you build, since it's baked into the QR code and the manifest.

## How it's put together

```
data/<slug>.json     — one person's info (the only thing you need to edit)
assets/               — shared logo + individual headshots
template/card.html    — the shared page template (all cards use this)
template/qr-tile.html — the fullscreen home-screen QR page template
lib/qr-brand.js       — generates the branded, scan-verified QR (rounded
                         dots, logo in the center, circular frame)
build.js              — renders template + data → dist/<slug>/
.github/workflows/    — auto-builds + deploys every data/*.json on push
```

The QR is regenerated at build time with high error-correction (so the logo
in the center doesn't break scanning) and is safe to re-theme in
`lib/qr-brand.js` if you want different colors or a different logo shape.
