import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { 
  Eraser, 
  Paintbrush, 
  Square, 
  Undo, 
  Redo, 
  Trash2, 
  Upload,
  Download,
  MousePointer2,
  Image as ImageIcon
} from 'lucide-react'

export type MaskEditorHandle = {
  getMaskData: () => string | null
  getOriginalData: () => string | null
  hasImage: () => boolean
  setImage: (src: string) => void
}

interface ImageMaskEditorProps {
  onImageChange?: (hasImage: boolean) => void
}

type ToolType = 'brush' | 'rect' | 'eraser'

export const ImageMaskEditor = forwardRef<MaskEditorHandle, ImageMaskEditorProps>(({ onImageChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<ToolType>('brush')
  const [brushSize, setBrushSize] = useState(20)
  const [isDrawing, setIsDrawing] = useState(false)
  const [scale, setScale] = useState(1)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  
  // 拖拽相关状态
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  // 初始化画布尺寸
  useEffect(() => {
    if (image && containerRef.current && canvasRef.current) {
      const container = containerRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      // 计算适应容器的尺寸，保持图片比例
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight || 500 // 默认高度
      
      const imgRatio = image.width / image.height
      const containerRatio = containerWidth / containerHeight
      
      let finalWidth, finalHeight
      
      if (imgRatio > containerRatio) {
        finalWidth = containerWidth
        finalHeight = containerWidth / imgRatio
      } else {
        finalHeight = containerHeight
        finalWidth = containerHeight * imgRatio
      }
      
      canvas.width = finalWidth
      canvas.height = finalHeight
      
      // 绘制图片背景
      if (ctx) {
        ctx.drawImage(image, 0, 0, finalWidth, finalHeight)
        saveState()
      }
      
      onImageChange?.(true)
    }
  }, [image])



  // 双画布策略：
  // 1. bgRef: 显示原图 (img 标签或 canvas)
  // 2. maskCanvasRef: 用户绘图层 (透明背景)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  
  // 重新实现初始化
  useEffect(() => {
    if (image && containerRef.current && maskCanvasRef.current) {
      const container = containerRef.current
      const canvas = maskCanvasRef.current
      
      // 计算尺寸
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight || 500
      
      const imgRatio = image.width / image.height
      const containerRatio = containerWidth / containerHeight
      
      let finalWidth, finalHeight
      
      if (imgRatio > containerRatio) {
        finalWidth = containerWidth
        finalHeight = containerWidth / imgRatio
      } else {
        finalHeight = containerHeight
        finalWidth = containerHeight * imgRatio
      }
      
      canvas.width = finalWidth
      canvas.height = finalHeight
      
      // 清空遮罩层
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, finalWidth, finalHeight)
        // 初始历史记录
        setHistory([ctx.getImageData(0, 0, finalWidth, finalHeight)])
        setHistoryIndex(0)
      }
      
      onImageChange?.(true)
    }
  }, [image])

  const saveState = () => {
    if (!maskCanvasRef.current) return
    const ctx = maskCanvasRef.current.getContext('2d')
    if (!ctx) return
    
    const imageData = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0 && maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d')
      if (!ctx) return
      const newIndex = historyIndex - 1
      ctx.putImageData(history[newIndex], 0, 0)
      setHistoryIndex(newIndex)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1 && maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d')
      if (!ctx) return
      const newIndex = historyIndex + 1
      ctx.putImageData(history[newIndex], 0, 0)
      setHistoryIndex(newIndex)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => setImage(img)
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }
  
  // 处理粘贴
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
              const img = new Image()
              img.onload = () => setImage(img)
              img.src = event.target?.result as string
            }
            reader.readAsDataURL(file)
          }
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!maskCanvasRef.current) return { x: 0, y: 0 }
    const rect = maskCanvasRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    
    // 鼠标在页面上的坐标 - 画布左上角的坐标 = 鼠标在画布内的相对像素位置（受 scale 影响）
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    // 因为我们是通过 CSS width/height 来缩放的，而 canvas.width/height (分辨率) 没变
    // 所以绘制坐标需要除以缩放比例
    // 但这里有一个 tricky 的点：rect.width 已经是缩放后的宽度了
    // 假设 canvas.width = 100, scale = 2, 则 rect.width = 200
    // 鼠标在最右边时 x = 200
    // 我们需要返回 100，所以 x * (100 / 200) = x * 0.5
    
    const scaleX = maskCanvasRef.current.width / rect.width
    const scaleY = maskCanvasRef.current.height / rect.height
    
    return {
      x: x * scaleX,
      y: y * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // 如果是鼠标事件，且不是左键点击，则不开始绘图
    if ('button' in e && e.button !== 0) return

    if (!maskCanvasRef.current) return
    setIsDrawing(true)
    const pos = getPointerPos(e)
    setStartPos(pos)
    
    const ctx = maskCanvasRef.current.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    
    // 设置样式
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)' // 半透明白色遮罩
      ctx.lineWidth = brushSize
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = brushSize
    } else if (tool === 'rect') {
      // 矩形工具在 move 时绘制
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !maskCanvasRef.current || !startPos) return
    const ctx = maskCanvasRef.current.getContext('2d')
    if (!ctx) return
    
    const currentPos = getPointerPos(e)
    
    if (tool === 'rect') {
      // 矩形需要重绘（这里需要优化：恢复到 startDrawing 前的状态再画矩形）
      // 简单起见，我们使用 putImageData 恢复上一帧（historyIndex），然后画矩形
      // 但由于 move 频率高，putImageData 可能有性能问题。
      // 更好的方式是使用临时层，或者直接重绘。
      // 这里采用：每次 move 都恢复到按下鼠标时的快照 (history[historyIndex])
      
      // 注意：这会导致 rect 模式下 move 时没有历史记录的中间态，这是对的。
      if (history[historyIndex]) {
        ctx.putImageData(history[historyIndex], 0, 0)
      }
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fillRect(
        startPos.x, 
        startPos.y, 
        currentPos.x - startPos.x, 
        currentPos.y - startPos.y
      )
    } else {
      // Brush / Eraser
      ctx.lineTo(currentPos.x, currentPos.y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveState()
    }
  }

  const clearMask = () => {
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
      saveState()
    }
  }

  // 导出遮罩数据 (黑底白形)
  const getMaskBase64 = () => {
    if (!maskCanvasRef.current || !image) return null
    
    // 创建临时 canvas，强制使用原图尺寸，解决遮罩错位问题
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = image.width
    tempCanvas.height = image.height
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) return null
    
    // 1. 填充黑色背景
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    
    // 2. 绘制当前的遮罩内容（拉伸到原图尺寸）
    // 为了确保是白色，我们可以设置 globalCompositeOperation
    ctx.globalCompositeOperation = 'source-over'
    // 关键修复：将当前的 maskCanvas (可能是缩小版) 绘制到 原图大小的 tempCanvas 上
    ctx.drawImage(maskCanvasRef.current, 0, 0, tempCanvas.width, tempCanvas.height)
    
    // 3. 将所有非黑色像素变为白色
    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      // 检查 Alpha 通道 (maskCanvasRef 里绘制的是半透明白，所以 alpha 不为 0)
      // 或者检查 RGB。
      // 简单逻辑：如果 maskCanvasRef 对应位置有像素，则这里应该是白色。
      // 由于我们先填了黑，再画了半透明白，所以现在是灰色。
      // 我们直接遍历像素，如果 R > 0 (或者不是纯黑)，就设为纯白。
      if (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0) {
        data[i] = 255     // R
        data[i+1] = 255   // G
        data[i+2] = 255   // B
        data[i+3] = 255   // A
      }
    }
    ctx.putImageData(imageData, 0, 0)
    
    return tempCanvas.toDataURL('image/png').split(',')[1]
  }

  // 拖拽处理逻辑
  const handleMouseDown = (e: React.MouseEvent) => {
    // 中键 (button 1)
    if (e.button === 1 && containerRef.current) {
      e.preventDefault()
      isDraggingRef.current = true
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop
      }
      containerRef.current.style.cursor = 'grabbing'
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current && containerRef.current) {
      e.preventDefault()
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      
      containerRef.current.scrollLeft = dragStartRef.current.scrollLeft - deltaX
      containerRef.current.scrollTop = dragStartRef.current.scrollTop - deltaY
    }
  }

  const handleMouseUp = () => {
    if (isDraggingRef.current && containerRef.current) {
      isDraggingRef.current = false
      containerRef.current.style.cursor = 'default'
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    // 按住 Ctrl 键或者 Meta 键（Mac Command）时触发缩放
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale(s => Math.min(5, Math.max(0.1, s + delta)))
    }
  }

  // 更新 ref 方法
  useImperativeHandle(ref, () => ({
    getMaskData: getMaskBase64,
    getOriginalData: () => {
       if (!image) return null
       // 返回原图的 base64
       const c = document.createElement('canvas')
       c.width = image.width
       c.height = image.height
       c.getContext('2d')?.drawImage(image, 0, 0)
       return c.toDataURL('image/png').split(',')[1]
    },
    hasImage: () => !!image,
    setImage: (src: string) => {
       const img = new Image()
       img.onload = () => setImage(img)
       img.src = src
    }
  }))

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="editor-upload"
          />
          
          <button
            onClick={() => setTool('brush')}
            className={`p-2 rounded-lg transition-colors ${tool === 'brush' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
            title="画笔"
          >
            <Paintbrush className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setTool('rect')}
            className={`p-2 rounded-lg transition-colors ${tool === 'rect' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
            title="框选"
          >
            <Square className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
            title="橡皮擦"
          >
            <Eraser className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />

          {/* 笔刷大小滑块 */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-slate-400">大小</span>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
            title="撤销"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
            title="重做"
          >
            <Redo className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />
          <button
            onClick={clearMask}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            title="清空画布"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 画布区域 */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-slate-100 dark:bg-black/20 rounded-xl overflow-auto border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer hover:border-violet-500/50 hover:bg-white/80 dark:hover:bg-white/10 transition-all group"
        onClick={() => !image && document.getElementById('editor-upload')?.click()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files?.[0]
          if (file) {
            handleFileUpload({ target: { files: [file] } } as any)
          }
        }}
      >
        {!image ? (
          <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors pointer-events-none">
            <Upload className="w-12 h-12 opacity-50" />
            <div className="text-sm text-center">点击或拖拽上传图片<br/><span className="text-xs text-slate-500">支持 Ctrl+V 粘贴</span></div>
          </div>
        ) : (
          <div 
            className="relative shadow-2xl shadow-black/20 cursor-auto transition-all duration-200 ease-out" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: maskCanvasRef.current ? maskCanvasRef.current.width * scale : 'auto',
              height: maskCanvasRef.current ? maskCanvasRef.current.height * scale : 'auto',
              flexShrink: 0 // 防止被 flex 容器压缩
            }}
          >
            {/* 底图层 */}
            <img 
              src={image.src} 
              style={{ width: '100%', height: '100%' }} 
              className="block pointer-events-none select-none"
              alt="background"
            />
            {/* 遮罩绘图层 */}
            <canvas
              ref={maskCanvasRef}
              className="absolute inset-0 cursor-crosshair touch-none"
              style={{ width: '100%', height: '100%' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        )}
      </div>
    </div>
  )
})

ImageMaskEditor.displayName = 'ImageMaskEditor'
