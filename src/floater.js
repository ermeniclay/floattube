// Universal Pop-Out — site-agnostic floating player.
// Runs on non-YouTube streaming sites (Twitch, Kick, Netflix, Disney+, Prime,
// TRT/Tabii, …). Finds the active <video> and floats it. When the browser
// supports the Document Picture-in-Picture API we move the video into a custom
// always-on-top window with our OWN controls (volume, mute, speed, seek) — the
// native PiP window has no volume slider. Falls back to native PiP otherwise.
(function () {
  "use strict";
  if (window.__ftFloaterLoaded) return;
  window.__ftFloaterLoaded = true;

  let btn = null;
  let docPip = null; // open Document-PiP window, if any

  /* ---------- video selection ---------- */

  function area(v) {
    const r = v.getBoundingClientRect();
    return r.width * r.height;
  }
  function onScreen(v) {
    const r = v.getBoundingClientRect();
    return r.width > 120 && r.height > 80 && r.bottom > 0 && r.top < innerHeight;
  }
  // Pick the most likely "main" video: prefer on-screen + playing, then largest.
  function pickVideo() {
    const all = [...document.querySelectorAll("video")].filter(
      (v) => v.readyState >= 1 && (v.videoWidth || v.videoHeight)
    );
    if (!all.length) return null;
    const visible = all.filter(onScreen);
    const pool = visible.length ? visible : all;
    const playing = pool.filter((v) => !v.paused && !v.ended);
    const candidates = playing.length ? playing : pool;
    return candidates.sort((a, b) => area(b) - area(a))[0];
  }

  function unlock(v) {
    try {
      v.removeAttribute("disablepictureinpicture");
      v.disablePictureInPicture = false;
    } catch (e) {}
  }

  /* ---------- pop-out (Document PiP preferred, native fallback) ---------- */

  async function popOut() {
    if (docPip) {
      try {
        docPip.close();
      } catch (e) {}
      return;
    }
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (e) {}
      return;
    }
    const v = pickVideo();
    if (!v) return toast("No playable video found on this page.");
    unlock(v);

    if (window.documentPictureInPicture && typeof documentPictureInPicture.requestWindow === "function") {
      try {
        await openDocPip(v);
        return;
      } catch (e) {
        // Some players break when reparented — fall back to native PiP.
      }
    }
    try {
      if (!document.pictureInPictureEnabled) {
        return toast("Picture-in-Picture is disabled in this browser.");
      }
      await v.requestPictureInPicture();
      if (v.paused) {
        try {
          await v.play();
        } catch (e) {}
      }
    } catch (e) {
      toast("Pop-out failed: " + (e && e.message ? e.message : e));
    }
  }

  /* ---------- Document PiP with custom controls ---------- */

  async function openDocPip(video) {
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 360;
    const width = 480;
    const height = Math.round(width * (vh / vw)) + 48;
    const pip = await documentPictureInPicture.requestWindow({ width, height });
    docPip = pip;

    // Remember where the video lived so we can put it back on close.
    const origParent = video.parentNode;
    const placeholder = document.createComment("ft-pip-slot");
    if (origParent) origParent.insertBefore(placeholder, video);
    const prevStyle = video.getAttribute("style") || "";
    const prevControls = video.controls;

    const d = pip.document;
    const style = d.createElement("style");
    style.textContent = PIP_CSS;
    d.head.appendChild(style);

    const root = d.createElement("div");
    root.className = "ftp-root";
    const stage = d.createElement("div");
    stage.className = "ftp-stage";
    video.removeAttribute("style");
    video.controls = false;
    stage.appendChild(video);
    root.appendChild(stage);
    root.appendChild(buildControls(d, video));
    d.body.appendChild(root);

    if (video.paused) {
      try {
        await video.play();
      } catch (e) {}
    }

    pip.addEventListener("pagehide", () => {
      docPip = null;
      video.controls = prevControls;
      if (prevStyle) video.setAttribute("style", prevStyle);
      else video.removeAttribute("style");
      if (placeholder.parentNode) placeholder.replaceWith(video);
      else if (origParent) origParent.appendChild(video);
      update();
    });
    update();
  }

  function buildControls(d, video) {
    const bar = d.createElement("div");
    bar.className = "ftp-bar";
    bar.innerHTML = `
      <button class="ftp-btn" data-act="play" title="Play / Pause">▶</button>
      <button class="ftp-btn" data-act="mute" title="Mute">🔊</button>
      <input class="ftp-vol" type="range" min="0" max="1" step="0.01" title="Volume">
      <span class="ftp-time">LIVE</span>
      <input class="ftp-seek" type="range" min="0" max="1000" step="1" title="Seek">`;
    const $ = (s) => bar.querySelector(s);
    const playBtn = $('[data-act="play"]');
    const muteBtn = $('[data-act="mute"]');
    const vol = $(".ftp-vol");
    const seek = $(".ftp-seek");
    const timeEl = $(".ftp-time");

    const isLive = () => !isFinite(video.duration) || video.duration === 0;
    const fmt = (s) => {
      s = Math.max(0, Math.floor(s || 0));
      return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    };
    function syncPlay() {
      playBtn.textContent = video.paused ? "▶" : "⏸";
    }
    function syncVol() {
      vol.value = video.muted ? 0 : video.volume;
      muteBtn.textContent = video.muted || video.volume === 0 ? "🔇" : "🔊";
    }
    function syncTime() {
      if (isLive()) {
        seek.style.display = "none";
        timeEl.textContent = "LIVE";
        return;
      }
      seek.style.display = "";
      if (video.duration) seek.value = Math.round((video.currentTime / video.duration) * 1000);
      timeEl.textContent = fmt(video.currentTime) + " / " + fmt(video.duration);
    }

    playBtn.onclick = () => (video.paused ? video.play() : video.pause());
    muteBtn.onclick = () => {
      video.muted = !video.muted;
      if (!video.muted && video.volume === 0) video.volume = 0.5;
    };
    vol.oninput = () => {
      video.volume = parseFloat(vol.value);
      video.muted = video.volume === 0;
    };
    seek.oninput = () => {
      if (video.duration && isFinite(video.duration))
        video.currentTime = (parseFloat(seek.value) / 1000) * video.duration;
    };

    video.addEventListener("play", syncPlay);
    video.addEventListener("pause", syncPlay);
    video.addEventListener("volumechange", syncVol);
    video.addEventListener("timeupdate", syncTime);
    syncPlay();
    syncVol();
    syncTime();
    return bar;
  }

  const PIP_CSS = `
    html,body{margin:0;height:100%;background:#000;overflow:hidden;
      font:500 12px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;}
    .ftp-root{display:flex;flex-direction:column;height:100%;}
    .ftp-stage{flex:1;min-height:0;display:flex;background:#000;}
    .ftp-stage video{width:100%;height:100%;object-fit:contain;background:#000;}
    .ftp-bar{display:flex;align-items:center;gap:8px;padding:6px 10px;height:36px;
      box-sizing:border-box;background:#121214;border-top:1px solid rgba(255,255,255,.1);}
    .ftp-btn{flex:none;width:26px;height:26px;border:none;border-radius:7px;cursor:pointer;
      background:rgba(255,255,255,.08);color:#fff;font-size:13px;line-height:1;}
    .ftp-btn:hover{background:rgba(255,255,255,.18);}
    .ftp-time{flex:none;color:#bbb;min-width:34px;text-align:center;}
    .ftp-vol{flex:none;width:80px;}
    .ftp-seek{flex:1;min-width:40px;}
    input[type=range]{accent-color:#ff3b5c;cursor:pointer;height:4px;}
  `;

  /* ---------- floating button ---------- */

  function makeButton() {
    if (btn) return btn;
    btn = document.createElement("button");
    btn.id = "ft-pip-fab";
    btn.type = "button";
    btn.title = "Pop out video (floating player) · Alt+P";
    btn.setAttribute("aria-label", "Pop out video");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
      </svg>`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      popOut();
    });
    (document.body || document.documentElement).appendChild(btn);
    return btn;
  }

  function update() {
    makeButton();
    btn.classList.toggle("ft-show", !!docPip || !!pickVideo());
    btn.classList.toggle("ft-active", !!docPip || !!document.pictureInPictureElement);
  }

  /* ---------- toast ---------- */

  function toast(msg) {
    let t = document.getElementById("ft-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "ft-toast";
      (document.body || document.documentElement).appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("ft-show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("ft-show"), 2400);
  }

  /* ---------- shortcut + lifecycle ---------- */

  addEventListener(
    "keydown",
    (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        popOut();
      }
    },
    true
  );

  function start() {
    makeButton();
    update();
    new MutationObserver(update).observe(document.documentElement, {
      subtree: true,
      childList: true
    });
    setInterval(update, 1500);
    document.addEventListener("enterpictureinpicture", update, true);
    document.addEventListener("leavepictureinpicture", update, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
