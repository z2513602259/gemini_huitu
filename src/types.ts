// 历史记录数据类型
export type HistoryItem = {
  id: string                    // UUID
  timestamp: number             // 时间戳
  mode: 'generate' | 'workflow' | 'inpainting' // 生成模式
  
  // 生成参数
  prompt: string                // 提示词
  aspectRatio: string           // 宽高比
  imageSize?: '1K' | '2K' | '4K' // 分辨率
  workflowId?: string           // 工作流 ID
  workflowName?: string         // 工作流名称
  
  // 图片数据
  imageData: string             // base64 完整图片
  mimeType: string              // 图片类型
  thumbnailData?: string        // 缩略图（可选优化）
  
  // 输入图片（可选）
  inputImages?: Array<{
    mimeType: string
    base64Data: string
  }>
  
  // 元数据
  generationTime?: number       // 生成耗时（秒）
}
