# Gemini 生图（可部署到腾讯 EdgeOne）

## 功能

- 可在页面里配置：API Base URL / API Path / API Key / 鉴权 Header
- **双模式支持**：
  - **纯生图（Text-to-Image）**：仅通过提示词生成图片
  - **图生图（Image-to-Image）**：上传参考图片 + 提示词，基于图片生成新图
- 生图参数：提示词、图片宽高比（`aspectRatio`）、分辨率档位（`imageSize: 1K/2K/4K`）
- 生成后预览与下载
- 纯静态站点：`npm run build` 产物为 `dist/`，可直接部署到腾讯 EdgeOne

## 接口约定（来自你的文档/示例）

- POST `...:generateContent`
- Header（二选一）：
  - `x-goog-api-key: <key>`
  - `Authorization: <key>`
- JSON body（核心字段）：
  - `contents[0].parts[0].text`: prompt
  - `generationConfig.imageConfig.aspectRatio`: `"16:9"` 等
  - `generationConfig.imageConfig.imageSize`: `"1K" | "2K" | "4K"`（可选）
- 响应中图片：从 `candidates[0].content.parts[*].inlineData.data`（或 `inline_data.data`）提取 base64

## 本地运行

在项目目录执行：

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

## 运行时配置（推荐）

本项目在 `index.html` 里会加载 `/config.js`。你可以在部署后直接编辑该文件（无需重新 build），提供默认配置：

- 文件：`public/config.js`（构建后会出现在 `dist/config.js`）

示例：

```js
window.__APP_CONFIG__ = {
  apiBaseUrl: 'https://api.vectorengine.ai',
  apiPath: '/v1beta/models/gemini-3-pro-image-preview:generateContent',
  apiKey: 'sk-xxx',
  authHeader: 'x-goog-api-key'
}
```

说明：

- 页面内修改的配置会写入浏览器 `localStorage`，优先级高于 `config.js`。
- **注意**：把 `apiKey` 写进静态文件等同于“前端暴露 key”。如果你需要更安全的方案，建议用 EdgeOne 边缘函数/自建后端做转发并在服务端保管 key。

## 部署到腾讯 EdgeOne（静态站点）

通用做法：

1. 本地执行 `npm run build` 得到 `dist/`
2. 在 EdgeOne 的静态站点/Pages 类产品中，将构建输出目录指向 `dist`
3. 部署完成后，访问站点并在页面里填写你的 API 配置即可

如果你使用 EdgeOne 的“从仓库自动构建”模式：

- Build Command：`npm install && npm run build`
- Output Directory：`dist`

