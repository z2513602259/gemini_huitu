# 架构设计

## 系统架构

### 整体架构
```
┌─────────────────────────────────────────┐
│         React 前端应用                    │
│  ┌─────────────────────────────────┐    │
│  │      App.tsx (主组件)            │    │
│  │  ┌──────────┐    ┌──────────┐   │    │
│  │  │生图模式   │    │工作流模式 │   │    │
│  │  └──────────┘    └──────────┘   │    │
│  └─────────────────────────────────┘    │
│           │              │               │
│           ▼              ▼               │
│  ┌─────────────────────────────────┐    │
│  │      api.ts (API 封装)           │    │
│  └─────────────────────────────────┘    │
│           │                              │
└───────────┼──────────────────────────────┘
            │
            ▼
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
- 模式切换逻辑
- UI 布局和交互

**关键状态**：
- `mode`: 'generate' | 'workflow' - 当前模式
- `selectedWorkflow`: 选中的工作流模板
- `inputImages`: 上传的参考图片数组
- `prompt`: 用户输入的提示词
- `aspectRatio`: 宽高比
- `imageSize`: 分辨率档位
- `imgUrl`: 生成的图片 URL
- `busy`: 生成中状态

**核心函数**：
- `onGenerate()`: 触发图片生成
- `handleImageUpload()`: 处理图片上传
- `handleDragStart/Over/End()`: 图片拖拽排序
- `regenerateFromHistory()`: 从历史记录恢复参数

### 2. API 模块 (api.ts)
**职责**：
- 封装 Gemini API 调用
- 处理请求和响应
- 错误处理

**核心函数**：
- `generateImage()`: 发送生成请求
  - 参数：配置、提示词、宽高比、分辨率、参考图片
  - 返回：生成的图片数据（mimeType + base64Data）

**API 请求结构**：
```typescript
{
  contents: [{
    parts: [
      { text: prompt },
      ...inputImages.map(img => ({
        inline_data: {
          mime_type: img.mimeType,
          data: img.base64Data
        }
      }))
    ]
  }],
  generationConfig: {
    imageConfig: {
      aspectRatio: string,
      imageSize?: '1K' | '2K' | '4K'
    }
  }
}
```

### 3. 历史记录模块 (historyDB.ts)
**职责**：
- IndexedDB 数据库管理
- 历史记录 CRUD 操作
- 存储限制管理

**核心函数**：
- `initDB()`: 初始化数据库
- `saveHistory()`: 保存历史记录
- `getAllHistory()`: 获取所有历史记录
- `deleteHistory()`: 删除指定记录
- `checkStorageLimit()`: 检查并清理超出限制的记录

**数据结构**：
```typescript
interface HistoryItem {
  id: string
  timestamp: number
  mode: 'generate' | 'workflow'
  prompt: string
  aspectRatio: string
  imageSize?: '1K' | '2K' | '4K'
  workflowId?: string
  workflowName?: string
  imageData: string
  mimeType: string
  inputImages?: Array<{
    mimeType: string
    base64Data: string
  }>
  generationTime: number
}
```

### 4. UI 组件

#### HistoryView.tsx
- 历史记录列表展示
- 支持删除和重新生成操作

#### GenerateButton.tsx
- 统一的生成按钮组件
- 支持禁用状态

#### LoadingSpinner.tsx
- 加载动画组件

## 数据流

### 图片生成流程
```
用户输入参数
    ↓
点击生成按钮
    ↓
onGenerate() 调用
    ↓
persistConfig() 保存配置
    ↓
generateImage() API 调用
    ↓
接收 Base64 图片数据
    ↓
更新 UI 显示结果
    ↓
saveHistory() 保存到 IndexedDB
    ↓
checkStorageLimit() 清理旧记录
```

### 配置管理流程
```
应用启动
    ↓
readInitialConfig()
    ├─ 读取 window.__APP_CONFIG__ (config.js)
    └─ 读取 localStorage
    ↓
合并配置（localStorage 优先）
    ↓
初始化状态
    ↓
用户修改配置
    ↓
persistConfig() 保存到 localStorage
```

## 关键设计决策

### 1. 状态管理
- **决策**：使用 React useState 进行本地状态管理
- **原因**：应用规模较小，不需要复杂的状态管理库
- **权衡**：如果应用扩展，可能需要引入 Context 或状态管理库

### 2. 数据持久化
- **决策**：使用 IndexedDB 存储历史记录
- **原因**：支持存储大量 Base64 图片数据，localStorage 容量有限
- **权衡**：IndexedDB API 较复杂，但提供更好的性能和容量

### 3. 图片处理
- **决策**：使用 Base64 编码传输和存储图片
- **原因**：Gemini API 要求 Base64 格式，简化处理流程
- **权衡**：Base64 增加约 33% 数据量，但避免了文件上传的复杂性

### 4. 配置管理
- **决策**：支持运行时配置（config.js）+ 本地存储
- **原因**：部署后可修改配置无需重新构建，提高灵活性
- **权衡**：API Key 暴露在前端，安全性较低

### 5. 工作流模板
- **决策**：硬编码模板列表在前端
- **原因**：模板数量有限，无需后端管理
- **权衡**：添加新模板需要重新部署，但简化了架构

## 性能考虑

### 优化点
1. **图片预览**：使用 `createObjectURL` 生成预览 URL
2. **拖拽排序**：仅在拖拽结束时更新状态
3. **历史记录限制**：自动清理超过 100 条的旧记录
4. **懒加载**：历史记录抽屉按需加载

### 潜在瓶颈
1. **大图片处理**：4K 图片的 Base64 编码可能较慢
2. **IndexedDB 查询**：大量历史记录时查询性能下降
3. **内存占用**：多张大图片同时加载可能占用大量内存

## 安全考虑

### 当前实现
- API Key 存储在 localStorage（明文）
- API Key 在前端代码中可见
- 无服务端验证

### 改进建议
1. 使用 EdgeOne 边缘函数转发 API 请求
2. 在服务端保管 API Key
3. 实现请求频率限制
4. 添加用户认证机制
