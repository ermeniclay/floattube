// YouTube SEO & Float Player — content script (isolated world).
// Right-docked, collapsible SEO/stats/tools panel (closed by default), a native
// player-bar pop-out button, and a pro Document-PiP floating player.
(function () {
  "use strict";

  const STATE = {
    data: null,
    panel: null,
    launcher: null,
    tab: "stats",
    loop: { a: null, b: null, on: false, handler: null }
  };

  /* ---------- page bridge ---------- */

  function injectBridge() {
    if (document.getElementById("ytseo-bridge")) return;
    const s = document.createElement("script");
    s.id = "ytseo-bridge";
    s.src = chrome.runtime.getURL("src/inject.js");
    (document.head || document.documentElement).appendChild(s);
  }
  function requestData() {
    window.postMessage({ source: "YTSEO_REQUEST" }, "*");
  }
  window.addEventListener("message", function (e) {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || m.source !== "YTSEO_PAGE") return;
    if (m.payload) {
      STATE.data = m.payload;
      renderActiveTab();
    }
  });

  /* ---------- helpers ---------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const vid = () => document.querySelector("video");
  const playerEl = () =>
    document.querySelector(".html5-video-player") || document.getElementById("movie_player");

  function fmtNumber(n) {
    if (n == null || isNaN(n)) return "—";
    return Number(n).toLocaleString("en-US");
  }
  function fmtCompact(n) {
    if (n == null || isNaN(n)) return "—";
    return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  function fmtDuration(sec) {
    if (!sec) return "—";
    const h = Math.floor(sec / 3600),
      m = Math.floor((sec % 3600) / 60),
      s = sec % 60,
      pad = (x) => String(x).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }
  function daysSince(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return Math.max(1, Math.floor((Date.now() - d.getTime()) / 86400000));
  }
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function readLikes() {
    const selectors = [
      "like-button-view-model button",
      "#segmented-like-button button",
      "#top-level-buttons-computed ytd-toggle-button-renderer button"
    ];
    for (const sel of selectors) {
      const el = $(sel);
      if (el) {
        const txt = (el.textContent || "").trim();
        if (txt && /\d/.test(txt)) return txt;
        const label = el.getAttribute("aria-label") || el.title || "";
        const m = label.replace(/,/g, "").match(/[\d.]+\s*[KMB]?/i);
        if (m) return m[0];
      }
    }
    return null;
  }
  function parseAbbrev(txt) {
    if (!txt) return null;
    const m = String(txt).trim().match(/^([\d.]+)\s*([KMB])?/i);
    if (!m) return null;
    let n = parseFloat(m[1]);
    const u = (m[2] || "").toUpperCase();
    if (u === "K") n *= 1e3;
    else if (u === "M") n *= 1e6;
    else if (u === "B") n *= 1e9;
    return Math.round(n);
  }
  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => flash(btn, "✓ Copied"));
  }
  function flash(btn, msg) {
    if (!btn) return;
    const old = btn.dataset.label || btn.textContent;
    btn.dataset.label = old;
    btn.textContent = msg;
    setTimeout(() => (btn.textContent = old), 1200);
  }
  function download(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function toast(msg) {
    let t = $("#ytseo-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "ytseo-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- SEO score ---------- */

  function seoScore(d) {
    let score = 0;
    const titleLen = (d.title || "").length;
    if (titleLen >= 40 && titleLen <= 70) score += 30;
    else if (titleLen >= 20 && titleLen <= 100) score += 18;
    else score += 6;
    const tags = (d.keywords || []).length;
    if (tags >= 10) score += 30;
    else if (tags >= 5) score += 22;
    else if (tags >= 1) score += 12;
    const descLen = (d.shortDescription || "").length;
    if (descLen >= 300) score += 25;
    else if (descLen >= 100) score += 16;
    else if (descLen > 0) score += 6;
    if (/#\w+/.test(d.shortDescription || "")) score += 8;
    if (/(https?:\/\/)/.test(d.shortDescription || "")) score += 7;
    return Math.min(100, score);
  }
  function scoreColor(s) {
    if (s >= 75) return "#2ecc71";
    if (s >= 45) return "#f0ad4e";
    return "#ff3b5c";
  }

  /* ---------- floating player (native Picture-in-Picture) ---------- */
  // Native PiP: no browser header, resizes smoothly, always-on-top.

  async function popOut() {
    const video = vid();
    if (!video) return toast("Play the video first.");
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      if (!document.pictureInPictureEnabled) {
        return toast("Picture-in-Picture is disabled in this browser.");
      }
      if (video.disablePictureInPicture) video.disablePictureInPicture = false;
      await video.requestPictureInPicture();
      // Nudge playback so the floating window never appears frozen.
      if (video.paused) {
        try {
          await video.play();
        } catch (e) {}
      }
    } catch (e) {
      toast("PiP failed: " + e.message);
    }
  }

  // vidIQ-style native button injected into the player control bar.
  function injectPlayerButton() {
    const bar = document.querySelector(".ytp-right-controls");
    if (!bar || document.getElementById("ytseo-ctrl-btn")) return;
    const btn = document.createElement("button");
    btn.id = "ytseo-ctrl-btn";
    btn.className = "ytp-button ytseo-ctrl-btn";
    btn.title = "Pop Out (Picture-in-Picture)";
    btn.setAttribute("aria-label", "Pop Out (Picture-in-Picture)");
    btn.innerHTML = `
      <svg height="100%" viewBox="0 0 36 36" width="100%">
        <g transform="translate(4.2 4.2) scale(1.15)" fill="#ff0033">
          <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
        </g>
      </svg>`;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      popOut();
    });
    btn.addEventListener("mouseenter", () => btn.classList.add("ytseo-ctrl-hover"));
    btn.addEventListener("mouseleave", () => btn.classList.remove("ytseo-ctrl-hover"));
    bar.insertBefore(btn, bar.firstChild);
  }

  /* ---------- other player tools ---------- */

  function setSpeed(rate) {
    const v = vid();
    if (!v) return;
    v.playbackRate = rate;
    toast("Speed: " + rate + "x");
  }
  function screenshot() {
    const v = vid();
    if (!v || !v.videoWidth) return toast("Could not capture frame.");
    try {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => {
        if (!b) return toast("Browser blocks this frame (CORS).");
        const url = URL.createObjectURL(b);
        download(url, `${STATE.data?.videoId || "frame"}_${Math.floor(v.currentTime)}s.png`);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast("Frame downloaded 📸");
      }, "image/png");
    } catch (e) {
      toast("Frame is protected: " + e.message);
    }
  }
  function copyLinkAtTime(btn) {
    const v = vid();
    const id = STATE.data?.videoId;
    if (!id) return;
    const t = v ? Math.floor(v.currentTime) : 0;
    copyText(`https://youtu.be/${id}?t=${t}`, btn);
  }
  function toggleLoopPoint(which) {
    const v = vid();
    if (!v) return;
    STATE.loop[which] = v.currentTime;
    toast(which.toUpperCase() + " = " + fmtDuration(Math.floor(v.currentTime)));
    maybeEnableLoop();
    renderActiveTab();
  }
  function maybeEnableLoop() {
    const v = vid();
    const lp = STATE.loop;
    if (!v) return;
    if (lp.handler) v.removeEventListener("timeupdate", lp.handler);
    if (lp.a != null && lp.b != null && lp.b > lp.a) {
      lp.on = true;
      lp.handler = () => {
        if (v.currentTime >= lp.b) v.currentTime = lp.a;
      };
      v.addEventListener("timeupdate", lp.handler);
      toast("A-B repeat on 🔁");
    }
  }
  function clearLoop() {
    const v = vid();
    const lp = STATE.loop;
    if (v && lp.handler) v.removeEventListener("timeupdate", lp.handler);
    STATE.loop = { a: null, b: null, on: false, handler: null };
    toast("A-B repeat off");
    renderActiveTab();
  }
  function exportJSON() {
    const d = STATE.data;
    if (!d) return;
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    download(url, `${d.videoId}_stats.json`);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------- panel shell (right-docked, closed by default) ---------- */

  const TABS = [
    { id: "stats", icon: "📊", label: "Stats" },
    { id: "seo", icon: "🔍", label: "SEO" },
    { id: "tools", icon: "🛠", label: "Tools" }
  ];

  function setOpen(open) {
    buildPanel();
    STATE.panel.classList.toggle("open", open);
    STATE.launcher.classList.toggle("hidden", open);
    chrome.storage.local.set({ ytseoOpen: open });
  }
  function togglePanel() {
    setOpen(!STATE.panel.classList.contains("open"));
  }

  function buildPanel() {
    if (STATE.panel) return STATE.panel;

    const launcher = document.createElement("button");
    launcher.id = "ytseo-launcher";
    launcher.title = "Open SEO & Stats";
    launcher.innerHTML = `<span class="ytseo-dot"></span><span class="ytseo-l-ico">📊</span>`;
    launcher.addEventListener("click", () => setOpen(true));
    document.body.appendChild(launcher);
    STATE.launcher = launcher;

    const panel = document.createElement("div");
    panel.id = "ytseo-panel";
    panel.innerHTML = `
      <div id="ytseo-header">
        <span class="ytseo-brand"><span class="ytseo-dot"></span>FloatTube</span>
        <div class="ytseo-actions">
          <button id="ytseo-close" title="Close">✕</button>
        </div>
      </div>
      <div id="ytseo-tabs">${TABS.map(
        (t) =>
          `<button class="ytseo-tab" data-tab="${t.id}"><span>${t.icon}</span>${t.label}</button>`
      ).join("")}</div>
      <div id="ytseo-content"></div>`;
    document.body.appendChild(panel);
    STATE.panel = panel;

    $("#ytseo-close", panel).addEventListener("click", () => setOpen(false));
    panel.querySelectorAll(".ytseo-tab").forEach((b) =>
      b.addEventListener("click", () => {
        STATE.tab = b.dataset.tab;
        renderActiveTab();
      })
    );

    // Default: CLOSED. Only restore "open" if the user opened it before.
    chrome.storage.local.get(["ytseoOpen"], (st) => setOpen(!!st.ytseoOpen));
    renderActiveTab();
    return panel;
  }

  /* ---------- render ---------- */

  function renderActiveTab() {
    const panel = buildPanel();
    panel.querySelectorAll(".ytseo-tab").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === STATE.tab)
    );
    const c = $("#ytseo-content", panel);
    const d = STATE.data;
    if (!d || !d.videoId) {
      c.innerHTML = `<div class="ytseo-empty">▶  Open a video…</div>`;
      return;
    }
    if (STATE.tab === "stats") renderStats(c, d);
    else if (STATE.tab === "seo") renderSEO(c, d);
    else renderTools(c, d);
  }

  function stat(label, value, sub) {
    return `<div class="ytseo-stat"><div class="ytseo-stat-v">${value}</div><div class="ytseo-stat-l">${label}</div>${
      sub ? `<div class="ytseo-stat-s">${sub}</div>` : ""
    }</div>`;
  }

  function renderStats(c, d) {
    const likesTxt = readLikes();
    const likes = parseAbbrev(likesTxt);
    const views = d.viewCount;
    const eng = likes && views ? ((likes / views) * 100).toFixed(2) + "%" : "—";
    const age = daysSince(d.publishDate);
    const vpd = age && views ? Math.round(views / age) : null;
    c.innerHTML = `
      <div class="ytseo-grid">
        ${stat("Views", fmtCompact(views), fmtNumber(views))}
        ${stat("Likes", likesTxt || "—", "")}
        ${stat("Engagement", eng, "likes / views")}
        ${stat("Daily", vpd != null ? fmtCompact(vpd) : "—", "views/day")}
        ${stat("Duration", fmtDuration(d.lengthSeconds), "")}
        ${stat("Age", age != null ? age + " days" : "—", fmtDate(d.publishDate))}
      </div>
      <div class="ytseo-line"><span>Category</span><b>${escapeHtml(d.category) || "—"}</b></div>
      <div class="ytseo-line"><span>Channel</span><b>${escapeHtml(d.author) || "—"}</b></div>
      <div class="ytseo-line"><span>Video ID</span>
        <span><code>${d.videoId}</code>
        <button class="ytseo-mini" data-copy="${d.videoId}">copy</button></span>
      </div>`;
    wireCopy(c);
  }

  function renderSEO(c, d) {
    const score = seoScore(d);
    const col = scoreColor(score);
    const R = 34, C = 2 * Math.PI * R;
    const off = C * (1 - score / 100);
    const tags = d.keywords || [];
    const titleLen = (d.title || "").length;
    const descLen = (d.shortDescription || "").length;
    const hints = [];
    hints.push(
      titleLen >= 40 && titleLen <= 70
        ? ["ok", `Title is ideal (${titleLen} chars)`]
        : ["warn", `Title ${titleLen} chars — 40–70 recommended`]
    );
    hints.push(
      tags.length >= 5
        ? ["ok", `${tags.length} tags`]
        : tags.length
        ? ["warn", `Few tags (${tags.length}) — 5+ recommended`]
        : ["bad", "No tags"]
    );
    hints.push(
      descLen >= 300 ? ["ok", "Rich description"] : ["warn", `Description ${descLen} chars — 300+ recommended`]
    );
    hints.push(
      /#\w+/.test(d.shortDescription || "")
        ? ["ok", "Has hashtags in description"]
        : ["warn", "Add hashtags to the description"]
    );
    const chips = tags.length
      ? tags.map((t) => `<span class="ytseo-chip">${escapeHtml(t)}</span>`).join("")
      : `<span class="ytseo-empty">No tags</span>`;
    const hashtags = tags.map((t) => "#" + t.replace(/\s+/g, "")).join(" ");
    c.innerHTML = `
      <div class="ytseo-score">
        <svg width="86" height="86" viewBox="0 0 86 86">
          <circle cx="43" cy="43" r="${R}" stroke="#2a2a2a" stroke-width="8" fill="none"/>
          <circle cx="43" cy="43" r="${R}" stroke="${col}" stroke-width="8" fill="none"
            stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}"
            transform="rotate(-90 43 43)"/>
          <text x="43" y="40" text-anchor="middle" fill="#fff" font-size="20" font-weight="700">${score}</text>
          <text x="43" y="56" text-anchor="middle" fill="#aaa" font-size="9">SEO</text>
        </svg>
        <div class="ytseo-score-side">
          <div class="ytseo-hints">
            ${hints.map((h) => `<div class="ytseo-hint ytseo-${h[0]}">${h[1]}</div>`).join("")}
          </div>
        </div>
      </div>
      <div class="ytseo-subhead"><span>Tags · ${tags.length}</span>
        <span>
          <button class="ytseo-mini" data-copy="${escapeHtml(tags.join(", "))}">copy</button>
          <button class="ytseo-mini" data-copy="${escapeHtml(hashtags)}">#hashtags</button>
        </span>
      </div>
      <div class="ytseo-chips">${chips}</div>`;
    wireCopy(c);
  }

  function renderTools(c, d) {
    const id = d.videoId;
    const lp = STATE.loop;
    const speeds = [1, 1.5, 2, 2.5, 3];
    c.innerHTML = `
      <button class="ytseo-btn primary" id="t-pip">📌 Pop Out (Picture-in-Picture)</button>
      <div class="ytseo-tool-grid">
        <button class="ytseo-btn" id="t-shot">📸 Save frame</button>
        <button class="ytseo-btn" id="t-link">🔗 Link at time</button>
      </div>
      <div class="ytseo-subhead"><span>Playback speed</span></div>
      <div class="ytseo-speeds">
        ${speeds.map((s) => `<button class="ytseo-pill" data-speed="${s}">${s}x</button>`).join("")}
      </div>
      <div class="ytseo-subhead"><span>A-B Repeat</span>
        <button class="ytseo-mini" id="t-abclear">clear</button></div>
      <div class="ytseo-tool-grid">
        <button class="ytseo-btn ${lp.a != null ? "set" : ""}" id="t-a">A ${
      lp.a != null ? "✓ " + fmtDuration(Math.floor(lp.a)) : ""
    }</button>
        <button class="ytseo-btn ${lp.b != null ? "set" : ""}" id="t-b">B ${
      lp.b != null ? "✓ " + fmtDuration(Math.floor(lp.b)) : ""
    }</button>
      </div>
      <div class="ytseo-subhead"><span>Download thumbnail</span></div>
      <div class="ytseo-tool-grid three">
        <button class="ytseo-btn" data-thumb="maxresdefault">Max</button>
        <button class="ytseo-btn" data-thumb="hqdefault">HQ</button>
        <button class="ytseo-btn" data-thumb="mqdefault">MQ</button>
      </div>
      <button class="ytseo-btn ghost" id="t-json">💾 Export stats as JSON</button>`;
    $("#t-pip", c).addEventListener("click", popOut);
    $("#t-shot", c).addEventListener("click", screenshot);
    $("#t-link", c).addEventListener("click", (e) => copyLinkAtTime(e.currentTarget));
    $("#t-a", c).addEventListener("click", () => toggleLoopPoint("a"));
    $("#t-b", c).addEventListener("click", () => toggleLoopPoint("b"));
    $("#t-abclear", c).addEventListener("click", clearLoop);
    $("#t-json", c).addEventListener("click", exportJSON);
    c.querySelectorAll("[data-speed]").forEach((b) =>
      b.addEventListener("click", () => setSpeed(parseFloat(b.dataset.speed)))
    );
    c.querySelectorAll("[data-thumb]").forEach((b) =>
      b.addEventListener("click", () =>
        window.open(`https://i.ytimg.com/vi/${id}/${b.dataset.thumb}.jpg`, "_blank")
      )
    );
  }

  function wireCopy(c) {
    c.querySelectorAll("button[data-copy]").forEach((b) =>
      b.addEventListener("click", () => copyText(b.dataset.copy, b))
    );
  }

  /* ---------- popup messaging ---------- */

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (!msg) return;
    if (msg.cmd === "pip") popOut();
    if (msg.cmd === "togglePanel") {
      buildPanel();
      togglePanel();
    }
    if (msg.cmd === "getStats") sendResponse(STATE.data || null);
    return true;
  });

  /* ---------- lifecycle ---------- */

  function setChromeVisible(show) {
    if (STATE.panel) STATE.panel.style.display = show ? "" : "none";
    if (STATE.launcher) STATE.launcher.style.display = show ? "" : "none";
  }

  function onNavigate() {
    const onWatch = location.pathname.startsWith("/watch");
    buildPanel();
    setChromeVisible(onWatch);
    if (onWatch) {
      setTimeout(requestData, 400);
      setTimeout(injectPlayerButton, 800);
    }
  }

  function init() {
    injectBridge();
    buildPanel();
    setChromeVisible(location.pathname.startsWith("/watch"));
    if (location.pathname.startsWith("/watch")) {
      setTimeout(requestData, 600);
      setTimeout(injectPlayerButton, 1000);
    }
    document.addEventListener("yt-navigate-finish", onNavigate);
    let last = location.href;
    setInterval(() => {
      if (location.href !== last) {
        last = location.href;
        onNavigate();
      }
      if (location.pathname.startsWith("/watch")) injectPlayerButton();
    }, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
