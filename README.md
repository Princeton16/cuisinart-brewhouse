# Brew Lab by Cuisinart

A community-driven coffee platform concept built for the Cuisinart FYP engagement. Phase 1 of the Conair connected ecosystem strategy.

## What this is

A clickable, functional MVP that demonstrates how Cuisinart can build coffee credibility and a community of recurring users. Built as a demo for client review, not production.

## Quick start

No build step. No installs. Just open `index.html` in any browser.

```
1. Double-click index.html
2. Sign up with any name and email (it stays in your browser only)
3. Complete the taste quiz
4. Explore the app
```

State is saved in your browser's localStorage. To reset, open dev tools and run `localStorage.clear()` then refresh.

## File structure

```
index.html      Landing page (marketing + sign up)
app.html        The actual app (dashboard, journal, recipes, community, etc.)
styles.css      All styling
app.js          Router, views, state management
data.js         Mock data (machines, recipes, beans, creators, badges)
README.md       This file
```

## Pushing to GitHub

If you've already cloned your repo locally, just drop these files in and run:

```bash
git add .
git commit -m "Initial Brew Lab MVP"
git push
```

If you want to host it for the client: GitHub Pages is free and takes one click. Repo Settings -> Pages -> Deploy from branch -> main.

## What's in here (mapped to the FYP storyline)

The site demonstrates ten mechanisms for the community + credibility play:

1. **Personalized brew recommendations** — taste quiz + recommendation engine. Reddit and YouTube cannot personalize.
2. **Recipes calibrated to your machine** — Cuisinart owns this. No third party can build it.
3. **Brew journal and tasting log** — first-party data Cuisinart captures, nobody else has.
4. **Community challenges and badges** — recurring engagement loop.
5. **Exclusive merch drops and giveaways** — owner-only perks, real reason to log in.
6. **Creator content from coffee experts** — credibility play, James Hoffmann / Lance Hedrick caliber.
7. **Machine health and warranty** — utility that brings owners back even when they aren't shopping for content.
8. **Bean price comparison** — cheapest place to buy beans across roasters, Amazon, and grocery. Members pay below the lowest public price.
9. **Virtual Barista chat** — assistant trained on the user's machine and journal. Better than Google search, kinder than r/espresso.
10. **Coffee Origins map** — interactive world map with farmer profiles and 4-7 minute videos filmed at each origin.
11. **Brew School with latte art classes** — Latte Art 101 with Lance Hedrick, milk steaming, espresso fundamentals, cupping. Free for members.

## Design notes

Modern coffee specialty look with a subtle Cuisinart green accent. Designed to attract a younger audience without alienating the existing 35-65 customer base. Primary palette is warm cream and deep espresso brown, with caramel as the accent color and Cuisinart green reserved for trust elements (warranty, machine health, verification badges).

## Known limitations

- No real backend. All data is in localStorage and resets if you clear it.
- Sign-in is simulated. Anyone can pretend to be anyone.
- Images use placeholder gradients and emoji unless you add real photos (see below).
- Mobile responsive but optimized for desktop demos.

## Photos

The site already shows real coffee photos for every recipe, bean, and product. They come from **loremflickr.com**, a free public service that serves Creative Commons photos from Flickr by keyword.

If you want to swap to your own photography, here is the workflow.

### Step-by-step

1. **Create a folder** named `images/` at the top level of this project (next to `index.html`).

2. **Drop your photos in.** Name them anything (e.g. `bean-onyx-monarch.jpg`, `recipe-morning-classic.jpg`).

3. **Edit `data.js`.** Replace the `photo:` URL on the item with your local file path:

```js
{
  id: 'onyx-monarch',
  name: 'Onyx Monarch Blend',
  // ...
  photo: 'images/bean-onyx-monarch.jpg'   // was a loremflickr URL
}
```

That's it. Save, refresh, the new photo loads. If a photo is missing, the emoji fallback shows.

### Where to find good free photos

- **Unsplash** (unsplash.com) — free, high quality, no attribution required
- **Pexels** (pexels.com) — same idea
- **Cuisinart product pages** for product photography (right-click → Save Image As)

### Recommended sizes

- Tile photos: 800×600 (4:3) — recipes, beans, products
- Origin photos: 1200×600 (16:7) for hero
- Class thumbnails: 800×600

### Tip

Don't want to download files? Replace any `photo:` URL with a direct `https://...` link to any image on the web. Unsplash's CDN URLs (`https://images.unsplash.com/photo-XXX...`) work fine.
