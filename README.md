# LinkedIn-AIBlocker

A local Chrome extension that scores LinkedIn feed posts with weighted linguistic heuristics (0–100). A session summary in the page’s top-right tracks how many posts have been scanned, how many were flagged as AI, and that share of the feed; it can be minimized. Each scanned post also gets a per-post badge with the AI score and how many parameters hit. If the score is **at least 25** and **at least 1 parameter** fires, the post is covered with a translucent black sheet and a compact card that uses that post’s type:

> **AI SLOP DETECTED 🗣️**
>
> Click **score** to see how the 0–100 total is summed (and which checks added points). Click **parameters** to see which of the six checks failed, then open a row for what that flag means on this post.
>
> **Show anyway** reveals the post. Opening score or parameters expands the card and hides that button; closing the panel returns the card to its original size.

This is a joke extension, not an accurate AI detector. Heuristics are tunable and easy to add.

On desktop, opening **Create a post** hides the session summary and shows a **Draft overview** card to the right of the composer (same height as the post box). It live-scores the draft with the same detectors and lists which parameters pass or fail while you type. Closing the composer restores the session summary.

`coverAllPosts` is currently `false` in [`src/config/settings.js`](src/config/settings.js), so posts are covered only when the score rule fires. Set it to `true` to cover every feed post again.

## Local install

You do not publish this to the Chrome Web Store. Load it unpacked:

1. Clone or open this repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this repo's root folder (the one that contains `manifest.json`).
5. Visit [https://www.linkedin.com/feed/](https://www.linkedin.com/feed/). Posts are scanned as they appear in view.

After you change code, click the refresh icon on the extension card in `chrome://extensions`, then reload the LinkedIn tab.

If the LinkedIn layout looks like the mobile site (icons along the bottom), that is usually the browser window being too narrow — for example with DevTools docked to the side. Widen the page or undock DevTools. This extension no longer changes LinkedIn’s layout CSS.

## How it works

1. A content script watches the feed with a `MutationObserver` and only expands/scores posts in the viewport.
2. Overlays and score badges sit in a closed Shadow DOM host **on the post itself** (`position: absolute; inset: 0`), so they scroll with the feed instead of being JS-repositioned every frame. LinkedIn CSS cannot restyle them and our CSS cannot restyle LinkedIn.
3. A host node is appended to each scored post (and `position: relative` is set only if the card was `static`). Click-to-dismiss is remembered by post id; the score badge stays. If LinkedIn strips the host, it is remounted.
4. If `coverAllPosts` is false, post text is scored by detectors in `src/detectors/` and covered when `ai_score >= 25` and `parametersHit >= 1`.

## Scoring

Weights in [`src/config/settings.js`](src/config/settings.js):

| Parameter | Points |
|---|---|
| Buzzword and transition density | 25 (2+ hits) or 10 (1 hit, not a parameter) |
| Structural templating | 25 |
| Low sentence burstiness | 25 |
| Report / briefing listicle | 25 |
| Engagement-bait conclusion | 15 |
| Sycophantic / empty tone | 10 |

Cover when **score >= 25** and **at least 1 full parameter** hits. DevTools logs a JSON-shaped verdict: `flagged`, `ai_score`, `confidence`, `signals_detected`, `reasoning`.

## Tuning detectors

All knobs live in [`src/config/settings.js`](src/config/settings.js):

- `coverAllPosts` — if `true`, every feed post gets the overlay (score badge still runs).
- `coverScoreThreshold` — default `25`. Overlay when `ai_score` is **at least** this and enough parameters hit.
- `coverMinParameters` — default `1`.
- `minTextLength` — skip very short posts (badge shows 0).
- `detectors.*` — turn individual checks on or off.

Per-detector phrase lists and thresholds are in the same file.

To add a new check:

1. Create `src/detectors/yourDetector.js` that returns `{ name, failed, points, signals, reason }`.
2. Register it in [`src/detectors/index.js`](src/detectors/index.js).
3. Add an enable flag and weight in `settings.js`.

## File layout

```
manifest.json
src/config/settings.js
src/detectors/          # one file per heuristic + registry
src/content/            # scanner, overlay, composer coach, classic content scripts
src/utils/text.js
styles/overlay.css
icons/icon128.png
```
