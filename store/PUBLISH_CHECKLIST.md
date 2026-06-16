# Publish Checklist — FloatTube → Chrome Web Store

Follow top to bottom. Most steps are one-time; updates only repeat the ⟳ steps.

## 0) One-time account setup
- [ ] Create a Chrome Web Store **developer account**:
      https://chrome.google.com/webstore/devconsole
- [ ] Pay the **one-time $5** registration fee.
- [ ] Set up the developer email / publisher name.

## 1) Host the privacy policy (required)
- [ ] Put `store/PRIVACY.md` content on a public URL. Easiest options:
      - Push this folder to a **public GitHub repo** and use the file's "raw" URL, or
      - Enable **GitHub Pages** and link the rendered page.
- [ ] Copy that URL — you'll paste it into the dashboard.

## 2) Final pre-flight on the code  ⟳
- [ ] Bump `version` in `manifest.json` if this is an update (e.g. 1.0.0 → 1.0.1).
- [ ] Load unpacked in `chrome://extensions` (Developer mode) and smoke-test:
      - [ ] Pop-out button appears in the player bar and floats the video.
      - [ ] Launcher tab opens/closes the panel; Stats/SEO/Tools all render.
      - [ ] Speed, A-B repeat, screenshot, thumbnail, JSON export work.
      - [ ] No errors in the page console related to the extension.
- [ ] Confirm permissions are minimal: `activeTab`, `storage`, host `youtube.com`.

## 3) Package the ZIP  ⟳
- [ ] From the project root run the packaging script:
      `pwsh ./store/package.ps1`  (creates `dist/floattube-vX.Y.Z.zip`)
- [ ] The ZIP must contain `manifest.json` at its ROOT (not inside a subfolder)
      and exclude `store/`, `dist/`, `.git`, and `README.md`.

## 4) Create the store listing  ⟳ (first time = full; updates = upload only)
- [ ] In the dashboard: **Add new item** → upload the ZIP.
- [ ] Fill fields from `store/STORE_LISTING.md`:
      - [ ] Name, short description, detailed description
      - [ ] Category = Productivity, language
      - [ ] **Single purpose** statement
      - [ ] **Permission justifications** (one per permission)
      - [ ] **Privacy policy URL** (from step 1)
      - [ ] **Data usage** disclosures (all "No" / not sold)
- [ ] Upload visuals from `store/SCREENSHOTS.md`:
      - [ ] 128×128 icon (auto from package, plus store icon)
      - [ ] 1–5 screenshots at 1280×800
      - [ ] (optional) 440×280 promo tile

## 5) Submit
- [ ] Choose visibility: **Public** (or Unlisted for a soft launch / testing).
- [ ] Submit for review. First review often takes a few hours up to a few days.
- [ ] You'll get an email when approved or if changes are requested.

## 6) After approval
- [ ] Verify the public listing installs and works from the store.
- [ ] (Optional) Share the link; ask early users for ratings — installs + ratings
      matter more than revenue at first.

## Update flow (later) ⟳
1. Make code changes (avoid adding NEW permissions — that pauses users until they
   re-approve).
2. Bump `version`.
3. Re-package (step 3) and upload (step 4 → just "Package" tab → upload new ZIP).
4. Submit. Users auto-update silently after approval.

## Notes
- Edge Add-ons and Opera have separate stores; the same ZIP usually works there
  too if you want wider reach later.
- Keep a backup of each shipped ZIP so you can reproduce any version.
