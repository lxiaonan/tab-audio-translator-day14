const STORAGE_KEY = "tab-audio-translator-day14";

const i18n = {
  zh: {
    eyebrow: "标签页音频翻译",
    title: "实时字幕控制台",
    bridgeUrl: "本地桥接服务",
    sourceLang: "源语言",
    targetLang: "目标语言",
    chunkSeconds: "切片秒数",
    testBridge: "测试连接",
    start: "开始翻译",
    stop: "停止",
    latestCaption: "最新字幕",
    openGuide: "打开使用说明",
    copyLog: "复制会话记录",
    idle: "未运行",
    idleText: "先启动本地桥接服务，再打开有声音的标签页。",
    running: "正在翻译",
    runningText: "正在捕获当前标签页音频并发送到本地桥接服务。",
    bridgeFail: "桥接服务不可用",
    copied: "已复制",
  },
  en: {
    eyebrow: "Tab audio translation",
    title: "Live Caption Console",
    bridgeUrl: "Local bridge service",
    sourceLang: "Source language",
    targetLang: "Target language",
    chunkSeconds: "Chunk seconds",
    testBridge: "Test bridge",
    start: "Start translation",
    stop: "Stop",
    latestCaption: "Latest caption",
    openGuide: "Open guide",
    copyLog: "Copy session log",
    idle: "Idle",
    idleText: "Start the local bridge service, then open a tab with audio.",
    running: "Translating",
    runningText: "Capturing current tab audio and sending chunks to the local bridge.",
    bridgeFail: "Bridge service unavailable",
    copied: "Copied",
  },
};

const state = {
  lang: localStorage.getItem(`${STORAGE_KEY}:lang`) || "zh",
  session: null,
  latest: null,
  log: [],
  settings: defaultSettings(),
};

const refs = {
  lang: document.querySelector("#lang-toggle"),
  bridgeUrl: document.querySelector("#bridge-url"),
  sourceLang: document.querySelector("#source-lang"),
  targetLang: document.querySelector("#target-lang"),
  chunkSeconds: document.querySelector("#chunk-seconds"),
  testBridge: document.querySelector("#test-bridge"),
  start: document.querySelector("#start"),
  stop: document.querySelector("#stop"),
  copyLog: document.querySelector("#copy-log"),
  statusCard: document.querySelector("#status-card"),
  statusTitle: document.querySelector("#status-title"),
  statusText: document.querySelector("#status-text"),
  source: document.querySelector("#latest-source"),
  target: document.querySelector("#latest-target"),
};

init();

async function init() {
  const saved = await chrome.storage.local.get(["settings", "latest", "log", "session"]);
  state.settings = { ...defaultSettings(), ...(saved.settings || {}) };
  state.latest = saved.latest || null;
  state.log = saved.log || [];
  state.session = saved.session || null;
  fillSettings();
  bind();
  render();
}

function bind() {
  refs.lang.addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    localStorage.setItem(`${STORAGE_KEY}:lang`, state.lang);
    render();
  });
  refs.start.addEventListener("click", start);
  refs.testBridge.addEventListener("click", testBridge);
  refs.stop.addEventListener("click", stop);
  refs.copyLog.addEventListener("click", copyLog);
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === "caption:update") {
      state.latest = message.caption;
      state.log = [...state.log, message.caption].slice(-80);
      render();
    }
    if (message.type === "session:state") {
      state.session = message.session;
      render();
    }
  });
}

async function testBridge() {
  const config = readSettings();
  const health = await checkBridge(config.bridgeUrl);
  if (!health.ok) {
    refs.statusTitle.textContent = t("bridgeFail");
    refs.statusText.textContent = health.error;
    return;
  }
  refs.statusTitle.textContent = "Bridge OK";
  refs.statusText.textContent = "Local service is reachable. v1.0.2";
}

async function start() {
  const config = readSettings();
  await chrome.storage.local.set({ settings: config });
  const health = await checkBridge(config.bridgeUrl);
  if (!health.ok) {
    refs.statusTitle.textContent = t("bridgeFail");
    refs.statusText.textContent = health.error;
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.runtime.sendMessage({ type: "capture:start", tabId: tab.id, config });
  if (!response?.ok) {
    refs.statusTitle.textContent = t("bridgeFail");
    refs.statusText.textContent = friendlyError(response?.error || "unknown", config.bridgeUrl);
  }
}

async function checkBridge(bridgeUrl) {
  try {
    const response = await fetch(`${bridgeUrl}/health`, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, error: `Bridge health check failed: HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error.message || String(error), bridgeUrl) };
  }
}

async function stop() {
  await chrome.runtime.sendMessage({ type: "capture:stop" });
}

async function copyLog() {
  const text = state.log.map(item => `[${item.at}] ${item.source}\n${item.target}`).join("\n\n");
  await navigator.clipboard.writeText(text || "");
  refs.statusText.textContent = t("copied");
}

function render() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  refs.lang.textContent = state.lang === "zh" ? "EN" : "中";
  document.querySelectorAll("[data-i18n]").forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  const running = Boolean(state.session?.running);
  refs.statusCard.classList.toggle("running", running);
  refs.statusTitle.textContent = running ? t("running") : t("idle");
  refs.statusText.textContent = running ? t("runningText") : t("idleText");
  refs.source.textContent = state.latest?.source || "-";
  refs.target.textContent = state.latest?.target || "-";
}

function t(key) {
  return i18n[state.lang][key] || key;
}

function defaultSettings() {
  return {
    bridgeUrl: "http://127.0.0.1:8787",
    sourceLang: "auto",
    targetLang: "zh",
    chunkSeconds: 5,
  };
}

function fillSettings() {
  const config = state.settings;
  refs.bridgeUrl.value = config.bridgeUrl;
  refs.sourceLang.value = config.sourceLang;
  refs.targetLang.value = config.targetLang;
  refs.chunkSeconds.value = config.chunkSeconds;
}

function readSettings() {
  state.settings = {
    bridgeUrl: refs.bridgeUrl.value.replace(/\/$/, ""),
    sourceLang: refs.sourceLang.value,
    targetLang: refs.targetLang.value,
    chunkSeconds: Math.max(2, Math.min(15, Number(refs.chunkSeconds.value || 5))),
  };
  return state.settings;
}

function friendlyError(error, bridgeUrl) {
  if (String(error).includes("Failed to fetch")) {
    return `Cannot reach local bridge at ${bridgeUrl}. Reload the extension in chrome://extensions and keep start-local-translator.bat running.`;
  }
  return error;
}
