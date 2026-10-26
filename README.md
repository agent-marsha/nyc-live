# NYC LIVE

Live views from New York City's public traffic camera network, built to run **inside a post on X
(Twitter)** — the same player-card pattern as ALWAYS UP.

- **Site (post this URL):** https://agent-marsha.github.io/nyc-live/
- **Player page (the framed view):** https://agent-marsha.github.io/nyc-live/live/

## What it streams

The **NYC DOT Traffic Management Center** camera network, published at `webcams.nyctmc.org`:

| | |
|---|---|
| Cameras | **975** (Manhattan 377 · Queens 212 · Brooklyn 207 · Staten Island 99 · Bronx 80) |
| Endpoint | `https://webcams.nyctmc.org/api/cameras` → JSON (id, name, lat, lng, area) |
| Frames | `…/api/cameras/<id>/image` → `image/jpeg`, 352×240, `cache-control: no-store` |
| Auth | none |
| Liveness | verified — the same URL returns a different frame seconds later; a 25-camera random sample returned 200 + a JPEG for **25/25** |

**These cameras are stills, not video.** This is not a limitation of the build — it is what NYC
publishes. `nyctmc.org`'s own app refreshes images on a 2 s timer (`refreshRate: 2000` in its
Angular bundle). There is no public HLS/video endpoint for the DOT network. So "live streaming"
here means the DOT's live frames, refreshed continuously.

## Two findings that shaped the build

1. **The list API sends no CORS header.** A browser `fetch()` to `webcams.nyctmc.org` from another
   origin is blocked, so the camera list is **baked into `cameras.json` at build time** (97 KB).
   NYC DOT asks developers to cache what doesn't change often — this also avoids hammering them.
2. **Hotlinking the images works.** `<img src>` is not subject to CORS, and the image endpoint
   returns 200 with a third-party `Referer`. So the pages stay fully static — GitHub Pages, no
   proxy, no server, no key.

## Request budget

It refreshes politely rather than maxing out:

- Hero view: every 1–5 s (user-selectable).
- Grid tiles: every 2.5 s *by default*, with jitter, and **only while on screen**
  (`IntersectionObserver` pauses off-screen tiles).
- Worst case ≈ 7 requests/second with the default settings.

## Layout

```
index.html      the wall — post this URL (player-card tags live here)
preview.jpg     card thumbnail, built from a real Broadway @ 45 St frame
styles.css      shared styling
app.js          wall logic (filters, search, tiles, featured view)
cameras.json    the camera list, cached at build time
live/index.html the player page X loads inside the post (480×600)
live/live.js    one camera at a time, preload-then-swap so there is no black flash
```

## Use note

NYC DOT asks developers who consume the camera feed to sign a **data-sharing agreement**
(`TMCDOT@dot.nyc.gov`, download at `nyctmc.org/subscribers`). This is a technical demonstration —
sign the agreement before any production or high-volume use.

---

A Human–Technology Interaction Lab (HTIL) prototype · Dept. of Computer Science ·
The University of Alabama.
