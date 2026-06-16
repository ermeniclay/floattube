function sendToTab(cmd) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !/youtube\.com/.test(tab.url || "")) {
      setHint("Not a YouTube page. Open a video.");
      return;
    }
    chrome.tabs.sendMessage(tab.id, { cmd }, () => {
      if (chrome.runtime.lastError) {
        setHint("Refresh the page and try again.");
      } else {
        window.close();
      }
    });
  });
}

function setHint(t) {
  document.getElementById("hint").textContent = t;
}

document.getElementById("pip").addEventListener("click", () => sendToTab("pip"));
document
  .getElementById("toggle")
  .addEventListener("click", () => sendToTab("togglePanel"));
