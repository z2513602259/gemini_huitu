# 架构设计

## 系统架构

### 整体架构
```
┌─────────────────────────────────────────┐
│         React 前端应用                    │
│  ┌─────────────────────────────────┐    │
│  │      App.tsx (主组件)            │    │
│  │  ┌──────┐ ┌──────┐ ┌────────┐   │    │
│  │  │生图   │ │工作流 │ │局部重绘  │   │    │
│  │  └──────┘ └──────┘ └────────┘   │    │
│  │                      │          │    │
│  │                 ImageMaskEditor │    │
│  └──────────────────────┬──────────┘    │
│           │             │               │
│           ▼             ▼               │
│  ┌─────────────────────────────────┐    │
│  │      api.ts (API 封装)           │    │
│  └─────────────────────────────────┘    │
│           │                              │
│           ▼                              │
┌─────────────────────────────────────────┐
│      Gemini API (外部服务)               │
│  POST /v1beta/models/...:generateContent │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      IndexedDB (本地存储)                │
│  - 历史记录数据                          │
│  - 图片 Base64 数据                      │
└─────────────────────────────────────────┘
```

## 核心模块

### 1. 主应用组件 (App.tsx)
**职责**：
- 应用状态管理
- 模式切换逻辑 ('generate' | 'workflow' | 'inpainting')
- UI 布局和交互
- 协调各个子组件

**关键状态**：
- `mode`: 当前模式
- `selectedWorkflow`: 选中的工作流模板
- `inputImages`: 上传的参考图片数组
- `prompt`: 用户输入的提示词
- `hasEditorImage`: 编辑器中是否有图片
- `pendingEditorImage`: 等待编辑的图片（用于从结果跳转编辑）
- `editorRef`: 引用 MaskEditor 实例以获取数据

**核心函数**：
- `onGenerate()`: 触发图片生成（包含 Inpainting 逻辑分支）
- `handleLayoutEdit()`: 将生成的图片发送到局部编辑模式
- `handlePaste()`: 全局粘贴处理

### 2. 局部重绘编辑器 (ImageMaskEditor.tsx)
**职责**：
- 提供图片上传和显示
- 提供绘图工具（画笔、矩形、橡皮擦）
- 生成遮罩数据（Mask）
- 历史记录管理（撤销/重做）

**关键技术**：
- **双 Canvas 架构**：底层显示原图，顶层 Canvas 用于绘制遮罩。
- **坐标转换**：处理鼠标/触摸事件坐标到 Canvas 内部坐标的转换，支持缩放。
- **遮罩导出**：将绘制的半透明遮罩转换为 API 需要的黑底白形遮罩图。
- **交互**：支持中键拖拽平移画布，Ctrl+滚轮缩放。

### 3. API 模块 (api.ts)
**职责**：
- 封装 Gemini API 调用
- 构造请求体（包含 Inpainting 所需的 Prompt 增强和遮罩数据）

**API 请求结构扩展 (Inpainting)**：
```typescript
{
  contents: [{
    parts: [
      { text: enhanced_prompt }, // 包含 [Instruction] 的增强提示词
      { inline_data: { mime_type: 'image/png', data: original_base64 } },
      { inline_data: { mime_type: 'image/png', data: mask_base64 } }
    ]
  }]
}
```

### 4. 历史记录模块 (historyDB.ts)
**职责**：
- IndexedDB 数据库管理
- 存储限制管理 (Max 100)

### 5. UI 组件
- **GenerateButton**: 统一生成按钮
- **LoadingSpinner**: 加载动画
- **HistoryView**: 历史记录列表
- **Design System**: 基于 Tailwind CSS + Glassmorphism 的统一视觉风格

## 数据流

### 局部重绘 (Inpainting) 流程
```
用户上传/选择图片
    ↓
ImageMaskEditor 显示图片
    ↓
用户使用工具绘制遮罩
    ↓
点击生成
    ↓
App.tsx 获取原图和遮罩数据 (via ref)
    ↓
App.tsx 构造增强 Prompt (Instruction + User Prompt)
    ↓
api.ts 发送请求 (原图 + 遮罩 + Prompt)
    ↓
Gemini API 返回重绘后的图片
    ↓
UI 显示结果
```

### 从结果跳转编辑
```
生成结果显示
    ↓
点击 "布局编辑"
    ↓
setPendingEditorImage(url)
setMode('inpainting')
    ↓
useEffect 监测到 mode 变化
    ↓
editorRef.current.setImage(url)
    ↓
用户开始在生成图上绘制
```

## 关键设计决策

### 1. Inpainting 实现方式
- **决策**：前端使用 Canvas 生成遮罩，通过 API 发送原图+遮罩+提示词。
- **原因**：Gemini API 支持多模态输入，通过 Prompt 指导模型进行 Inpainting 是目前最灵活的方式。
- **Prompt 策略**：在前端硬编码一段 `[Instruction]`，明确告诉模型黑色区域保持不变，白色区域重绘。

### 2. Canvas 交互
- **决策**：实现缩放和平移功能。
- **原因**：为了精细编辑，用户需要放大图片。
- **实现**：通过 CSS `transform` 或 `width/height` 控制显示尺寸，Canvas 内部分辨率保持与原图一致（或适应容器），计算坐标时进行逆变换。

### 3. 状态管理
- **决策**：`ImageMaskEditor` 内部维护绘图历史栈，外部只关心最终导出的数据。
- **原因**：解耦编辑器的内部逻辑和应用业务逻辑。`App.tsx` 不需要知道用户画了多少笔，只需要在生成时获取当前的 Mask。

## 性能考虑
- **Canvas 性能**：使用 `will-change` 优化合成层；导出大图遮罩时使用离屏 Canvas。
- **内存管理**：Inpainting 涉及原图、遮罩、历史记录多份数据，注意及时释放（虽然 JS 有 GC，但 Canvas 占用显存/内存较大）。

## 安全考虑
- 同前（API Key 暴露问题）。
