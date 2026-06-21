# Privacy Policy — FloatTube (Pop-Out Player & SEO)

_Last updated: 2026-06-21_

FloatTube is a browser extension that adds an always-on-top pop-out (floating)
player to the video on whatever page you are watching — on any website — and an
SEO / statistics panel on YouTube. Your privacy matters — here is exactly what
the extension does and does not do.

## What data we collect

**None.** FloatTube does not collect, transmit, sell, or share any personal data.

- We do **not** run any servers and send **no** data off your device.
- We do **not** use analytics, tracking, advertising, or third-party SDKs.
- We do **not** read your browsing history, cookies, or passwords. The extension
  runs on the pages you open only to find a playing video and add the floating
  player; it does not collect or transmit the content of those pages.

## Data the extension uses locally (never leaves your device)

- **Video information shown in the panel** (title, tags, views, likes, duration,
  category, publish date) is read **on the page** from YouTube's own player data
  and displayed back to you. It is never stored or uploaded.
- **The floating player** simply moves the page's existing video element into an
  always-on-top window; the video stream is never copied, recorded, or sent
  anywhere.
- **Your settings** (panel open/closed state, active tab) are saved with
  `chrome.storage.local` **on your own browser** so the extension remembers your
  preferences. This data stays on your device and is removed if you uninstall.

## Permissions and why they are needed

- **`storage`** — to remember your panel preferences locally.
- **`activeTab`** — so the toolbar popup can talk to the YouTube tab you are
  viewing when you click the extension.
- **Host access to all sites (`<all_urls>`)** — pop-out is a generic feature
  that must work wherever a video plays, so the content script runs on the pages
  you open to detect the active video and add the floating-player button. On
  YouTube only, it additionally reads the public video data for the panel.

Although the extension can run on any page, it only ever interacts with the
video element (and, on YouTube, the public video metadata). It never reads or
sends the content of the pages you visit.

## Thumbnail / link actions

When you click "Download thumbnail", your browser opens an image hosted by
YouTube (`i.ytimg.com`). When you "Copy link at time", a YouTube link is copied
to your clipboard. These actions are initiated by you and involve no third party.

## Children's privacy

FloatTube collects no data from anyone, including children.

## Changes to this policy

If this policy changes, the updated version will be published with the
extension. Continued use after an update constitutes acceptance.

## Contact

Questions about privacy? Contact: **yalcinhometablet@gmail.com**

---

_FloatTube is an independent project and is not affiliated with, endorsed by, or
sponsored by YouTube, Twitch, Kick, Netflix, Disney, Amazon, TRT, or Google LLC.
All trademarks belong to their respective owners._
