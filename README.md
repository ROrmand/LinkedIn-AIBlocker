# LinkedIn-AIBlocker

A local Chrome extension that scans LinkedIn feed posts with a handful of linguistic heuristics. If more than 3 detectors fire, the post is covered with a red overlay:

> **AI DETECTED** 🤖
>
> We have scanned this post and determined that this is AI.
> We covered up the post to protect you from the AI.
>
> Click to see the post anyways.

This is a joke extension, not an accurate AI detector. Heuristics are tunable and easy to add.

`coverAllPosts` is currently `true` in [`src/config/settings.js`](src/config/settings.js), so every feed post is covered. Set it to `false` to go back to detector scoring.

## Local install

You do not publish this to the Chrome Web Store. Load it unpacked:

1. Clone or open this repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this repo's root folder (the one that contains `manifest.json`).
5. Visit [https://www.linkedin.com/feed/](https://www.linkedin.com/feed/). Posts are scanned automatically as you scroll.

After you change code, click the refresh icon on the extension card in `chrome://extensions`, then reload the LinkedIn tab.

If the LinkedIn layout looks like the mobile site (icons along the bottom), that is usually the browser window being too narrow — for example with DevTools docked to the side. Widen the page or undock DevTools. This extension no longer changes LinkedIn’s layout CSS.

## How it works

1. A content script watches the feed with a `MutationObserver`.
2. Overlays are drawn in a closed Shadow DOM host on `document.documentElement`, so LinkedIn CSS cannot restyle them and our CSS cannot restyle LinkedIn.
3. LinkedIn nodes are not modified (no classes or data attributes). Click-to-dismiss is remembered by post id.
4. If `coverAllPosts` is false, post text is scored by detectors in `src/detectors/` and covered when `failedCount > failureThreshold`.

## Tuning detectors

All knobs live in [`src/config/settings.js`](src/config/settings.js):

- `coverAllPosts` — if `true`, every feed post gets the overlay (detectors are skipped).
- `failureThreshold` — overlay when `failedCount > threshold`. With 4 detectors and a threshold of 3, all 4 must fail.
- `minTextLength` — skip very short posts.
- `detectors.*` — turn individual checks on or off.

Per-detector thresholds (burstiness CV, filler density, generic-opener count, etc.) are in the same file.

To add a new check:

1. Create `src/detectors/yourDetector.js` that exports a function returning `{ name, failed, reason? }`.
2. Register it in [`src/detectors/index.js`](src/detectors/index.js).
3. Add an enable flag in `settings.js`.

Open DevTools on LinkedIn to see `console.debug` lines listing which detectors fired.

## File layout

```
manifest.json
src/config/settings.js
src/detectors/          # one file per heuristic + registry
src/content/            # scanner, overlay, classic content scripts
src/utils/text.js
styles/overlay.css
icons/icon128.png
```
