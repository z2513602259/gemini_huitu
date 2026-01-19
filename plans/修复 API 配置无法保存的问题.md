# 修复配置保存失效问题

## 问题分析
经过代码审查，发现当前应用存在配置保存逻辑缺失的问题：
1. **现状**：目前的 `persistConfig`（保存配置）函数仅在点击 **"生成图片"** 按钮触发 `onGenerate` 时才会被调用。
2. **缺陷**：设置弹窗底部的 **"确定"** 按钮仅绑定了 `setShowSettings(false)`，这意味着它只会关闭弹窗 UI，而**不会**将您修改后的配置写入浏览器本地存储 (`localStorage`)。
3. **结果**：如果您修改了配置但没有立即生成图片就刷新页面，配置就会丢失。

## 实施计划

### 1. 修正设置弹窗逻辑
修改 `src/App.tsx` 文件中设置弹窗底部的"确定"按钮点击事件。

- **当前代码**：
  ```tsx
  <button className="primary" onClick={() => setShowSettings(false)}>确定</button>
  ```
- **修改为**：
  ```tsx
  <button className="primary" onClick={() => {
    persistConfig() // 新增：保存配置到 localStorage
    setShowSettings(false)
  }}>确定</button>
  ```

### 2. 验证修复
- 打开设置弹窗，修改 API Key 或其他参数。
- 点击"确定"关闭弹窗。
- 刷新浏览器页面。
- 再次打开设置，确认修改后的参数依然存在。
