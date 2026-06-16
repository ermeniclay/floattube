// Runs in the PAGE context (not the isolated content-script world) so it can
// reach YouTube's player API and the freshest video metadata, then forwards a
// clean payload back to the content script via window.postMessage.
(function () {
  "use strict";

  function getPlayerResponse() {
    // After SPA navigation, window.ytInitialPlayerResponse is stale.
    // The live <#movie_player> element exposes the current response.
    const p = document.getElementById("movie_player");
    if (p && typeof p.getPlayerResponse === "function") {
      try {
        const r = p.getPlayerResponse();
        if (r && r.videoDetails) return r;
      } catch (e) {
        /* fall through */
      }
    }
    return window.ytInitialPlayerResponse || null;
  }

  function extract(pr) {
    if (!pr || !pr.videoDetails) return null;
    const vd = pr.videoDetails || {};
    const mf =
      (pr.microformat && pr.microformat.playerMicroformatRenderer) || {};
    return {
      videoId: vd.videoId || null,
      title: vd.title || "",
      author: vd.author || (mf.ownerChannelName || ""),
      channelId: vd.channelId || null,
      lengthSeconds: parseInt(vd.lengthSeconds, 10) || 0,
      viewCount: parseInt(vd.viewCount, 10) || 0,
      keywords: Array.isArray(vd.keywords) ? vd.keywords : [],
      shortDescription: vd.shortDescription || "",
      isLive: !!vd.isLiveContent,
      category: mf.category || "",
      publishDate: mf.publishDate || "",
      uploadDate: mf.uploadDate || "",
      isFamilySafe: mf.isFamilySafe,
      availableCountries: Array.isArray(mf.availableCountries)
        ? mf.availableCountries.length
        : null
    };
  }

  function send() {
    const data = extract(getPlayerResponse());
    window.postMessage({ source: "YTSEO_PAGE", payload: data }, "*");
  }

  window.addEventListener("message", function (e) {
    if (e.source !== window) return;
    if (e.data && e.data.source === "YTSEO_REQUEST") send();
  });

  // YouTube SPA navigation event.
  document.addEventListener("yt-navigate-finish", function () {
    setTimeout(send, 350);
  });

  send();
})();
