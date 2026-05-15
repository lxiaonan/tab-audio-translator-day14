const copy = {
  zh: {
    eyebrow: "Day14 · Chrome 标签页音频实时翻译",
    title: "把任意有声音的标签页，变成可翻译字幕流。",
    lead: "扩展负责捕获当前标签页音频和字幕浮层，本地 Python 桥接服务负责 ASR，并可选择本地 Argos、Google 或 DeepLX 翻译。没有配置真实引擎时，项目会明确提示，不伪造识别结果。",
    installCta: "查看安装步骤",
    guideCta: "小白文档",
    realCapture: "真实标签页音频捕获",
    realCaptureText: "使用 Chrome 扩展 tabCapture 权限捕获当前活动标签页音频，而不是麦克风伪替代。",
    localBridge: "本地桥接服务",
    localBridgeText: "扩展把 WebM 音频切片发送到 127.0.0.1:8787，桥接服务再调用 whisper.cpp、Argos、Google 或 DeepLX。",
    honestFallback: "诚实降级",
    honestFallbackText: "没有真实 ASR 引擎时，只返回“未配置引擎”的状态，避免把假字幕当成功能。",
    installEyebrow: "安装与使用",
    installTitle: "四步跑起来",
    step1: "推荐先双击 start-online-google-translator.bat；隐私内容则双击 start-local-translator.bat。",
    step2: "打开 Chrome chrome://extensions/，启用开发者模式。",
    step3: "点击“加载已解压的扩展程序”，选择项目根目录。",
    step4: "打开有声音的网页，点击扩展图标，设置语言后开始翻译。",
    module1: "扩展弹窗",
    module1Text: "配置桥接地址、源语言、目标语言、切片长度，并查看最新字幕。",
    module2: "字幕浮层",
    module2Text: "content script 在当前页面底部显示双语字幕，不改变原网页布局。",
    module3: "会话记录",
    module3Text: "保存最近字幕日志，可复制会议、课程、视频的翻译记录。",
    modesEyebrow: "翻译模式",
    modesTitle: "按隐私和质量选择启动方式",
    modeLocal: "纯本地",
    modeLocalText: "双击 start-local-translator.bat，音频识别和翻译都在本机完成，适合隐私内容。",
    modeGoogle: "Google 快速试用",
    modeGoogleText: "双击 start-online-google-translator.bat，使用本地 whisper.cpp 识别，再调用 Google 免费翻译接口。",
    modeDeeplx: "DeepLX 高质量",
    modeDeeplxText: "设置 TAT_DEEPLX_URL 后启动 DeepLX 模式，翻译更自然，但识别文本会发送到你的接口。",
  },
  en: {
    eyebrow: "Day14 · Chrome tab audio live translation",
    title: "Turn any audible browser tab into a translatable caption stream.",
    lead: "The extension captures current-tab audio and renders captions. A local Python bridge runs ASR and can use local Argos, Google, or DeepLX translation. If no real engine is configured, it says so instead of faking captions.",
    installCta: "View install steps",
    guideCta: "Beginner guide",
    realCapture: "Real tab audio capture",
    realCaptureText: "Uses Chrome's tabCapture permission to capture the active tab's audio, not a microphone substitute.",
    localBridge: "Local bridge service",
    localBridgeText: "The extension sends WebM audio chunks to 127.0.0.1:8787, then the bridge calls whisper.cpp, Argos, Google, or DeepLX.",
    honestFallback: "Honest fallback",
    honestFallbackText: "Without a real ASR engine, it returns a clear not-configured state instead of pretending to translate.",
    installEyebrow: "Install and use",
    installTitle: "Run in four steps",
    step1: "Start with start-online-google-translator.bat; use start-local-translator.bat for private content.",
    step2: "Open Chrome chrome://extensions/ and enable Developer mode.",
    step3: "Click Load unpacked and choose the project root.",
    step4: "Open an audible page, click the extension icon, set languages, and start.",
    module1: "Extension popup",
    module1Text: "Configure bridge URL, source language, target language, chunk length, and view latest captions.",
    module2: "Caption overlay",
    module2Text: "The content script displays bilingual captions at the bottom of the current page without changing layout.",
    module3: "Session log",
    module3Text: "Keeps recent caption history so meeting, course, and video translations can be copied.",
    modesEyebrow: "Translation modes",
    modesTitle: "Choose by privacy and quality",
    modeLocal: "Fully local",
    modeLocalText: "Double-click start-local-translator.bat. ASR and translation stay on your machine, ideal for private content.",
    modeGoogle: "Google quick trial",
    modeGoogleText: "Double-click start-online-google-translator.bat. It uses local whisper.cpp ASR, then Google's public translate endpoint.",
    modeDeeplx: "DeepLX quality mode",
    modeDeeplxText: "Set TAT_DEEPLX_URL and start DeepLX mode for more natural translation. Recognized text is sent to your endpoint.",
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
