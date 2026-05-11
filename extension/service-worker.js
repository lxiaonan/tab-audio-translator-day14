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

  if (message.type === "audio:chunk") {
    uploadChunkFromWorker(message.tabId, message.chunk)
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: friendlyError(error.message) }));
    return true;
  }

  if (message.type === "capture:error") {
    publishCaption(message.tabId, {
      at: new Date().toLocaleTimeString(),
      source: "Capture error",
      target: friendlyError(message.error),
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
  await publishCaption(tabId, {
    at: new Date().toLocaleTimeString(),
    source: "Listening to current tab audio...",
    target: "正在监听当前标签页音频，等待第一个切片完成。",
    status: "listening",
  });
  await chrome.runtime.sendMessage({
    type: "offscreen:start",
    tabId,
    streamId,
    config,
  });
  return { ok: true };
}

function friendlyError(error) {
  if (String(error).includes("Failed to fetch")) {
    return "Service worker fetch failed. Test Bridge can pass while audio upload fails; reload extension, keep start-local-translator.bat running, then retry with chunk size 2.";
  }
  return error;
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

async function uploadChunkFromWorker(tabId, chunk) {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(chunk.bytes)], { type: chunk.mimeType || "audio/webm" });
  form.append("audio", blob, `chunk-${String(chunk.index).padStart(4, "0")}.webm`);
  form.append("source_lang", chunk.sourceLang);
  form.append("target_lang", chunk.targetLang);
  form.append("chunk_index", String(chunk.index));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  let response;
  try {
    response = await fetch(`${chunk.bridgeUrl}/translate-chunk`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(
      error.name === "AbortError"
        ? "Service worker upload timed out while calling /translate-chunk. Try chunk size 2 or model tiny."
        : `Service worker cannot POST audio to ${chunk.bridgeUrl}/translate-chunk: ${error.message || error}.`
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Bridge returned HTTP ${response.status}. ${detail}`.trim());
  }
  const payload = await response.json();
  await publishCaption(tabId, {
    at: new Date().toLocaleTimeString(),
    source: payload.source_text || payload.source || "",
    target: payload.translated_text || payload.target || "",
    confidence: payload.confidence ?? null,
    status: payload.status || "ok",
  });
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
