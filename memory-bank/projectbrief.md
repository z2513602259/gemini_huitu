# 项目概述

## 项目名称
零界设计 - Gemini 图片生成应用

## 项目描述
基于 Gemini API 的图片生成 Web 应用，支持文生图和图生图两种模式，可部署到腾讯 EdgeOne 静态站点。

## 核心功能
- **双模式支持**
  - 生图模式：纯文本提示词生成图片（Text-to-Image）
  - 工作流模式：基于参考图片 + 提示词生成图片（Image-to-Image）
  
- **生成参数配置**
  - 10 种宽高比选项（1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9）
  - 4 种分辨率档位（默认、1K、2K、4K）
  - 支持多张参考图片上传（拖拽、粘贴、文件选择）
  - 图片拖拽排序功能

- **工作流模板**（Beta）
  - 动漫风格转换
  - 油画风格转换
  - 照片增强
  - 背景虚化
  - 复古胶片效果
  - 赛博朋克风格
  - 产品细节图生成
  - 产品多角度生成
  - 产品精修
  - 产品替换

- **历史记录**
  - 基于 IndexedDB 存储
  - 支持查看历史生成记录
  - 支持从历史记录重新生成
  - 自动限制存储数量（最多 100 条）

- **API 配置**
  - 运行时配置支持（config.js）
  - 浏览器本地存储配置
  - 支持两种鉴权方式（x-goog-api-key / Authorization）

## 技术栈
- **前端框架**: React 18.3.1
- **开发语言**: TypeScript 5.6.3
- **构建工具**: Vite 6.0.1
- **数据存储**: IndexedDB（历史记录）
- **部署目标**: 腾讯 EdgeOne 静态站点

## 项目结构
```
gemini_huitu/
├── src/
│   ├── App.tsx           # 主应用组件
│   ├── api.ts            # API 调用封装
│   ├── types.ts          # TypeScript 类型定义
│   ├── historyDB.ts      # IndexedDB 历史记录管理
│   ├── HistoryView.tsx   # 历史记录视图组件
│   ├── GenerateButton.tsx # 生成按钮组件
│   ├── LoadingSpinner.tsx # 加载动画组件
│   ├── styles.css        # 全局样式
│   └── main.tsx          # 应用入口
├── public/
│   ├── config.js         # 运行时配置文件
│   └── icon.svg          # 应用图标
├── plans/                # 功能方案文档
├── 文档/                 # API 文档
└── 示例/                 # 代码示例
```

## 部署方式
1. 本地构建：`npm run build` 生成 `dist/` 目录
2. 部署到腾讯 EdgeOne 静态站点
3. 可通过修改 `dist/config.js` 进行运行时配置（无需重新构建）

## 安全注意事项
- API Key 在前端暴露（适合个人使用或内部工具）
- 生产环境建议使用 EdgeOne 边缘函数或自建后端转发 API 请求
