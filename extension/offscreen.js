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
      forwardChunk(event.data, config, tabId).catch(error => {
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

async function forwardChunk(blob, config, tabId) {
  const bytes = [...new Uint8Array(await blob.arrayBuffer())];
  const currentIndex = chunkIndex;
  chunkIndex += 1;
  const response = await chrome.runtime.sendMessage({
    type: "audio:chunk",
    tabId,
    chunk: {
      bytes,
      mimeType: blob.type || "audio/webm",
      index: currentIndex,
      sourceLang: config.sourceLang,
      targetLang: config.targetLang,
      bridgeUrl: config.bridgeUrl,
    },
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Service worker failed to upload audio chunk.");
  }
}

function preferredMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || "";
}
