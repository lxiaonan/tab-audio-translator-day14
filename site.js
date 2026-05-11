const copy = {
  zh: {
    eyebrow: "Day14 · Chrome 标签页音频实时翻译",
    title: "把任意有声音的标签页，变成可翻译字幕流。",
    lead: "扩展负责捕获当前标签页音频和字幕浮层，本地 Python 桥接服务负责 ASR/翻译接口。没有配置真实引擎时，项目会明确提示，不伪造识别结果。",
    installCta: "查看安装步骤",
    guideCta: "小白文档",
    realCapture: "真实标签页音频捕获",
    realCaptureText: "使用 Chrome 扩展 tabCapture 权限捕获当前活动标签页音频，而不是麦克风伪替代。",
    localBridge: "本地桥接服务",
    localBridgeText: "扩展把 WebM 音频切片发送到 127.0.0.1:8787，桥接服务再调用你配置的 ASR/翻译命令。",
    honestFallback: "诚实降级",
    honestFallbackText: "没有真实 ASR 引擎时，只返回“未配置引擎”的状态，避免把假字幕当成功能。",
    installEyebrow: "安装与使用",
    installTitle: "四步跑起来",
    step1: "启动本地桥接服务：python .\\bridge\\server.py。",
    step2: "打开 Chrome chrome://extensions/，启用开发者模式。",
    step3: "点击“加载已解压的扩展程序”，选择项目根目录。",
    step4: "打开有声音的网页，点击扩展图标，设置语言后开始翻译。",
    module1: "扩展弹窗",
    module1Text: "配置桥接地址、源语言、目标语言、切片长度，并查看最新字幕。",
    module2: "字幕浮层",
    module2Text: "content script 在当前页面底部显示双语字幕，不改变原网页布局。",
    module3: "会话记录",
    module3Text: "保存最近字幕日志，可复制会议、课程、视频的翻译记录。",
  },
  en: {
    eyebrow: "Day14 · Chrome tab audio live translation",
    title: "Turn any audible browser tab into a translatable caption stream.",
    lead: "The extension captures current-tab audio and renders captions. A local Python bridge handles ASR and translation hooks. If no real engine is configured, it says so instead of faking captions.",
    installCta: "View install steps",
    guideCta: "Beginner guide",
    realCapture: "Real tab audio capture",
    realCaptureText: "Uses Chrome's tabCapture permission to capture the active tab's audio, not a microphone substitute.",
    localBridge: "Local bridge service",
    localBridgeText: "The extension sends WebM audio chunks to 127.0.0.1:8787, then the bridge calls your configured ASR/translation command.",
    honestFallback: "Honest fallback",
    honestFallbackText: "Without a real ASR engine, it returns a clear not-configured state instead of pretending to translate.",
    installEyebrow: "Install and use",
    installTitle: "Run in four steps",
    step1: "Start the local bridge: python .\\bridge\\server.py.",
    step2: "Open Chrome chrome://extensions/ and enable Developer mode.",
    step3: "Click Load unpacked and choose the project root.",
    step4: "Open an audible page, click the extension icon, set languages, and start.",
    module1: "Extension popup",
    module1Text: "Configure bridge URL, source language, target language, chunk length, and view latest captions.",
    module2: "Caption overlay",
    module2Text: "The content script displays bilingual captions at the bottom of the current page without changing layout.",
    module3: "Session log",
    module3Text: "Keeps recent caption history so meeting, course, and video translations can be copied.",
  },
};

let lang = localStorage.getItem("tat-site-lang") || "zh";
const button = document.querySelector("#lang-toggle");
button.addEventListener("click", () => {
  lang = lang === "zh" ? "en" : "zh";
  localStorage.setItem("tat-site-lang", lang);
  render();
});
render();

function render() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  button.textContent = lang === "zh" ? "EN" : "中";
  document.querySelectorAll("[data-i18n]").forEach(node => {
    node.textContent = copy[lang][node.dataset.i18n] || node.dataset.i18n;
  });
}
