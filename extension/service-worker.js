let session = { running: false };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "capture:start") {
    startCapture(message.tabId, message.config)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "capture:stop") {
    stopCapture();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "caption:update") {
    publishCaption(message.tabId, message.caption);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "capture:error") {
    publishCaption(message.tabId, {
      at: new Date().toLocaleTimeString(),
      source: "Capture error",
      target: message.error,
      status: "error",
    });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

async function startCapture(tabId, config) {
  await probeBridge(config.bridgeUrl);
  stopCapture();
  await ensureOffscreenDocument();
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });

  session = {
    running: true,
    tabId,
    startedAt: new Date().toISOString(),
    config,
  };
  await chrome.storage.local.set({ session });
  broadcastSession();
  await chrome.runtime.sendMessage({
    type: "offscreen:start",
    tabId,
    streamId,
    config,
  });
  return { ok: true };
}

function stopCapture() {
  chrome.runtime.sendMessage({ type: "offscreen:stop" }).catch(() => {});
  session = { running: false, stoppedAt: new Date().toISOString() };
  chrome.storage.local.set({ session });
  broadcastSession();
}

async function probeBridge(bridgeUrl) {
  const response = await fetch(`${bridgeUrl}/health`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Bridge health check failed: ${response.status}`);
  }
}

async function publishCaption(tabId, caption) {
  const current = await chrome.storage.local.get(["latest", "log"]);
  const log = [...(current.log || []), caption].slice(-80);
  await chrome.storage.local.set({ latest: caption, log });
  chrome.runtime.sendMessage({ type: "caption:update", caption }).catch(() => {});
  chrome.tabs.sendMessage(tabId, { type: "caption:update", caption }).catch(() => {});
}

function broadcastSession() {
  chrome.runtime.sendMessage({ type: "session:state", session }).catch(() => {});
  if (session.tabId) {
    chrome.tabs.sendMessage(session.tabId, { type: "session:state", session }).catch(() => {});
  }
}

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("extension/offscreen.html")],
  });
  if (existing.length) return;
  await chrome.offscreen.createDocument({
    url: "extension/offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Record current tab audio chunks for local subtitle translation.",
  });
}
