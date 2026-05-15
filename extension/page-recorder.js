let tatRecorder = null;
let tatChunkIndex = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "page-recorder:start") {
    startPageRecorder(message.config)
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "page-recorder:stop") {
    stopPageRecorder();
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

async function startPageRecorder(config) {
  stopPageRecorder();
  const media = findPlayableMedia();
  if (!media) {
    throw new Error("No playing video/audio element found on this page. Start playback first.");
  }
  if (typeof media.captureStream !== "function") {
    throw new Error("This media element does not support captureStream().");
  }
  const stream = media.captureStream();
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) {
    throw new Error("The playing media has no capturable audio track. Try unmuting or using another player.");
  }
  const audioOnly = new MediaStream(audioTracks);
  tatChunkIndex = 0;
  tatRecorder = new MediaRecorder(audioOnly, {
    mimeType: preferredMimeType(),
    audioBitsPerSecond: 64000,
  });
  tatRecorder.ondataavailable = event => {
    if (event.data?.size > 4096) {
      forwardChunk(event.data, config).catch(error => {
        chrome.runtime.sendMessage({ type: "capture:error", tabId: null, error: error.message });
      });
    }
  };
  tatRecorder.start(config.chunkSeconds * 1000);
}

function stopPageRecorder() {
  if (tatRecorder && tatRecorder.state !== "inactive") {
    tatRecorder.stop();
  }
  tatRecorder = null;
}

function findPlayableMedia() {
  const items = [...document.querySelectorAll("video, audio")];
  return items.find(item => !item.paused && !item.muted && item.readyState >= 2)
    || items.find(item => !item.paused && item.readyState >= 2)
    || items.find(item => item.readyState >= 2);
}

async function forwardChunk(blob, config) {
  const bytes = [...new Uint8Array(await blob.arrayBuffer())];
  const index = tatChunkIndex;
  tatChunkIndex += 1;
  const response = await chrome.runtime.sendMessage({
    type: "audio:chunk",
    tabId: null,
    chunk: {
      bytes,
      mimeType: blob.type || "audio/webm",
      index,
      sourceLang: config.sourceLang,
      targetLang: config.targetLang,
      bridgeUrl: config.bridgeUrl,
    },
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Service worker failed to upload page audio chunk.");
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
