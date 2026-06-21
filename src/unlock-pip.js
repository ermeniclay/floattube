// Runs in the PAGE (MAIN) world so it can neutralize a site's attempts to block
// Picture-in-Picture. Some players (Netflix, Disney+, Prime) set
// video.disablePictureInPicture = true and re-apply it after seeks/ads. We strip
// it once and override the setter so future re-locks are swallowed. DRM itself
// does NOT block native <video> PiP — only this attribute does.
(function () {
  "use strict";
  if (window.__ftUnlockLoaded) return;
  window.__ftUnlockLoaded = true;

  function unlock(v) {
    if (!v || v.__ftUnlocked) return;
    try {
      v.__ftUnlocked = true;
      v.removeAttribute("disablepictureinpicture");
      Object.defineProperty(v, "disablePictureInPicture", {
        configurable: true,
        get() {
          return false;
        },
        set() {
          // Swallow the site re-locking PiP; keep the attribute off.
          try {
            this.removeAttribute("disablepictureinpicture");
          } catch (e) {}
        }
      });
    } catch (e) {}
  }

  function scan() {
    document.querySelectorAll("video").forEach(unlock);
  }

  scan();
  try {
    new MutationObserver(scan).observe(document.documentElement, {
      subtree: true,
      childList: true
    });
  } catch (e) {}
})();
