let recorder = null;
let stream = null;
let chunkIndex = 0;
let activeTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "offscreen:start") {
    start(message)
      .then(() => sendResponse({ ok: true }))
      .catch(error => {
        chrome.runtime.sendMessage({ type: "capture:error", tabId: message.tabId, error: error.message });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }
  if (message.type === "offscreen:stop") {
    stop();
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

async function start({ tabId, streamId, config }) {
  stop();
  activeTabId = tabId;
  chunkIndex = 0;
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });
  recorder = new MediaRecorder(stream, {
    mimeType: preferredMimeType(),
    audioBitsPerSecond: 64000,
  });
  recorder.ondataavailable = event => {
    if (event.data?.size) {
      uploadChunk(event.data, config, tabId).catch(error => {
        chrome.runtime.sendMessage({ type: "capture:error", tabId, error: error.message });
      });
    }
  };
  recorder.start(config.chunkSeconds * 1000);
}

function stop() {
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }
  recorder = null;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  activeTabId = null;
}

async function uploadChunk(blob, config, tabId) {
  const form = new FormData();
  form.append("audio", blob, `chunk-${String(chunkIndex).padStart(4, "0")}.webm`);
  form.append("source_lang", config.sourceLang);
  form.append("target_lang", config.targetLang);
  form.append("chunk_index", String(chunkIndex));
  chunkIndex += 1;
  const response = await fetch(`${config.bridgeUrl}/translate-chunk`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Bridge returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  chrome.runtime.sendMessage({
    type: "caption:update",
    tabId,
    caption: {
      at: new Date().toLocaleTimeString(),
      source: payload.source_text || payload.source || "",
      target: payload.translated_text || payload.target || "",
      confidence: payload.confidence ?? null,
      status: payload.status || "ok",
    },
  });
}

function preferredMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || "";
}
