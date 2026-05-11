# 小白使用文档 / Beginner Guide

## 中文

### 先理解一句话

这个项目分两部分：

- Chrome 插件：负责抓“当前标签页”的声音，并把字幕显示到网页底部。
- 本地 Python 服务：负责接收音频，调用真正的语音识别和翻译工具。

如果没有配置真实语音识别工具，它不会凭空翻译，会提示未配置。

### 安装步骤

1. 安装 Python 3。
2. 打开 PowerShell。
3. 进入项目目录。
4. 运行：

```powershell
python .\bridge\server.py
```

5. 保持这个窗口不要关。
6. 打开 Chrome。
7. 地址栏输入 `chrome://extensions/`。
8. 打开右上角“开发者模式”。
9. 点击“加载已解压的扩展程序”。
10. 选择 `tab-audio-translator-day14` 项目根目录。
11. 打开一个有声音的网页。
12. 点击浏览器右上角插件图标。
13. 点击“开始翻译”。

### 为什么一开始可能没有真实字幕

因为这个项目不会内置收费或巨大的语音模型。默认桥接服务只证明链路跑通：扩展能抓音频，服务能接收音频，字幕层能显示结果。

要得到真实字幕，需要配置 ASR：

```powershell
$env:TAT_ASR_COMMAND = "python .\my_asr.py --audio {audio} --lang {source_lang}"
python .\bridge\server.py
```

### 适合的场景

- 看英文教程，希望生成中文字幕。
- 看外语直播或会议回放，希望有一个可控的字幕层。
- 做自己的本地 Whisper / 翻译服务前端。

## English

### One-Sentence Explanation

This project has two parts:

- Chrome extension: captures current-tab audio and renders captions on the page.
- Local Python service: receives audio and calls a real speech recognition / translation tool.

If no real ASR tool is configured, it does not fake translation.

### Install Steps

1. Install Python 3.
2. Open PowerShell.
3. Enter the project folder.
4. Run:

```powershell
python .\bridge\server.py
```

5. Keep that window open.
6. Open Chrome.
7. Go to `chrome://extensions/`.
8. Enable “Developer mode”.
9. Click “Load unpacked”.
10. Select the `tab-audio-translator-day14` project root.
11. Open a page with audio.
12. Click the extension icon.
13. Click “Start translation”.

### Why Real Captions May Not Appear At First

The project does not bundle a paid or huge speech model. The default bridge proves the pipeline: extension captures audio, service receives audio, overlay displays responses.

To get real captions, configure an ASR command:

```powershell
$env:TAT_ASR_COMMAND = "python .\my_asr.py --audio {audio} --lang {source_lang}"
python .\bridge\server.py
```

### Good Use Cases

- Watching English tutorials with Chinese captions.
- Following foreign-language livestreams or meeting recordings.
- Building a frontend for your own local Whisper / translation service.
