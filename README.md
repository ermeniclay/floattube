# FloatTube — Pop-Out Player & SEO

A browser extension that pops any video into an **always-on-top floating window**
(like Opera's video popout) — on YouTube, Twitch, Kick, Netflix, Disney+, Prime
Video and TRT/Tabii — and shows an **SEO + statistics panel** on YouTube.

> Manifest V3 · Chrome / Edge / Opera (Chromium) · **No API key required.**

## Features

- 📌 **Pop-out floating player** — one click (or `Alt+P`) floats the video above
  every window. On YouTube it uses a player-bar button; on other video sites a
  floating button appears, opening a custom window with **volume, mute, and a
  seek bar** built in (via the Document Picture-in-Picture API, native PiP
  fallback).
- 📊 **SEO & stats panel** — *YouTube only* (right-docked, closed by default, opens on click):
  - SEO score (0–100) with actionable hints
  - Tags / keywords with "copy" and "copy as #hashtags"
  - Views, likes, engagement rate, daily views, video age, duration, category
  - Title and description length checks, copyable Video ID
- 🛠 **Tools:** save the current frame as PNG, copy a link to the current
  second, playback speed presets (up to 3x), A–B repeat, thumbnail download
  (Max/HQ/MQ), export stats as JSON.
- 🔒 **Private by design** — no accounts, no tracking, no servers. Everything is
  read on the page and stored locally. Runs only on the supported video sites.

## Install (developer mode)

1. Open `chrome://extensions` in Chrome / Edge / Opera.
2. Enable **Developer mode** (top right).
3. **Load unpacked** → select this folder.
4. Open a YouTube video (`youtube.com/watch?...`).

## Usage

- A small tab on the right edge opens the **SEO & stats panel**.
- The **red pop-out button** in the player control bar floats the video; click it
  again to close.
- You can also use the toolbar popup to pop out or toggle the panel.

## Data source

Stats are read on the page from YouTube's own player data
(`movie_player.getPlayerResponse()` → `videoDetails` / `microformat`); tags come
from there. Like count is read from the DOM on a best-effort basis (it may be
empty across UI/language changes).

## Project structure

```
manifest.json          # MV3 manifest
src/inject.js          # YouTube page-context bridge (reads player data)
src/content.js         # YouTube panel + pop-out + tools (isolated world)
src/panel.css          # YouTube panel styles
src/floater.js         # universal pop-out player for other video sites
src/floater.css        # universal floating button + window styles
src/unlock-pip.js      # MAIN-world helper that unblocks PiP (Netflix etc.)
popup/                 # toolbar popup (html/css/js)
icons/                 # 16/48/128 PNG
docs/privacy.html      # hosted privacy policy (GitHub Pages)
store/                 # store listing copy, screenshots, packaging, assets
```

## Publishing

The Chrome Web Store package lives in `store/`:

- `STORE_LISTING.md` — name, descriptions (EN/TR), permission justifications
- `PRIVACY.md` / `docs/privacy.html` — privacy policy
- `SCREENSHOTS.md` — visual asset guide; ready-made assets in `store/assets/`
- `PUBLISH_CHECKLIST.md` — step-by-step submission flow
- `package.ps1` — builds `dist/floattube-vX.Y.Z.zip`
- `make-assets.ps1` — regenerates the promo tile + screenshots

Privacy policy URL: <https://ermeniclay.github.io/floattube/privacy.html>

## Limitations / roadmap

- **Firefox** doesn't support the same floating-player API; the pop-out button
  targets Chromium browsers.
- DOM-read fields (like/subscriber counts) depend on YouTube's UI.
- Ideas: estimated revenue, channel-average comparison, transcript export,
  most-replayed peak, theme adaptation, video filters (night mode).

## License & disclaimer

Independent project — **not affiliated with, endorsed by, or sponsored by
YouTube or Google LLC**. "YouTube" is a trademark of Google LLC.
