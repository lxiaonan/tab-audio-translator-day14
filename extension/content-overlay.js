const OVERLAY_ID = "tat-live-caption-overlay";

chrome.runtime.onMessage.addListener(message => {
  if (message.type === "caption:update") {
    renderCaption(message.caption);
  }
  if (message.type === "session:state" && !message.session?.running) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.dataset.state = "idle";
  }
});

function renderCaption(caption) {
  const overlay = ensureOverlay();
  overlay.dataset.state = caption.status || "ok";
  overlay.querySelector("[data-source]").textContent = caption.source || "";
  overlay.querySelector("[data-target]").textContent = caption.target || "";
  overlay.querySelector("[data-time]").textContent = caption.at || new Date().toLocaleTimeString();
}

function ensureOverlay() {
  let overlay = document.getElementById(OVERLAY_ID);
  if (overlay) return overlay;
  overlay = document.createElement("aside");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("aria-live", "polite");
  overlay.innerHTML = `
    <div class="tat-shell">
      <div class="tat-meta">
        <strong>Tab Audio Translator</strong>
        <span data-time>-</span>
      </div>
      <p data-source></p>
      <h2 data-target>Waiting for captions...</h2>
    </div>
  `;
  document.documentElement.appendChild(overlay);
  return overlay;
}
