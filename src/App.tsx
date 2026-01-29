import React, { useEffect, useMemo, useRef, useState } from 'react'
import { generateImage, type AuthHeaderMode } from './api'
import { GenerateButton } from './GenerateButton'
import { LoadingSpinner } from './LoadingSpinner'
import { HistoryView } from './HistoryView'
import { saveHistory, checkStorageLimit } from './historyDB'
import type { HistoryItem } from './types'
import { ImageMaskEditor, type MaskEditorHandle } from './ImageMaskEditor'
import { 
  Settings, History, Image as ImageIcon, Sparkles, Workflow, 
  Upload, X, Download, ChevronDown, Eye, EyeOff, LayoutGrid,
  Maximize2, Layers, Wand2, Ratio, Monitor, ImagePlus, Sun, Moon,
  Brush
} from 'lucide-react'

type SizeOption = {
  label: string
  imageSize?: '1K' | '2K' | '4K'
}

type RatioOption = {
  ratio: string
  px: {
    '1K'?: string
    '2K'?: string
    '4K'?: string
  }
}

const RATIOS: RatioOption[] = [
  { ratio: '1:1', px: { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' } },
  { ratio: '2:3', px: { '1K': '848x1264', '2K': '1696x2528', '4K': '3392x5056' } },
  { ratio: '3:2', px: { '1K': '1264x848', '2K': '2528x1696', '4K': '5056x3392' } },
  { ratio: '3:4', px: { '1K': '896x1200', '2K': '1792x2400', '4K': '3584x4800' } },
  { ratio: '4:3', px: { '1K': '1200x896', '2K': '2400x1792', '4K': '4800x3584' } },
  { ratio: '4:5', px: { '1K': '928x1152', '2K': '1856x2304', '4K': '3712x4608' } },
  { ratio: '5:4', px: { '1K': '1152x928', '2K': '2304x1856', '4K': '4608x3712' } },
  { ratio: '9:16', px: { '1K': '768x1376', '2K': '1536x2752', '4K': '3072x5504' } },
  { ratio: '16:9', px: { '1K': '1376x768', '2K': '2752x1536', '4K': '5504x3072' } },
  { ratio: '21:9', px: { '1K': '1584x672', '2K': '3168x1344', '4K': '6336x2688' } }
]

const SIZE_OPTIONS: SizeOption[] = [
  { label: '默认', imageSize: undefined },
  { label: '1K', imageSize: '1K' },
  { label: '2K', imageSize: '2K' },
  { label: '4K', imageSize: '4K' }
]

type WorkflowTemplate = {
  id: string
  name: string
  icon: string
  description: string
  prompt: string
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'anime-style',
    name: '动漫风格',
    icon: '🎨',
    description: '将照片转换为动漫风格',
    prompt: 'Convert this image to anime style, with vibrant colors, clean lines, and typical anime character features'
  },
  {
    id: 'oil-painting',
    name: '油画风格',
    icon: '🖼️',
    description: '转换为油画艺术风格',
    prompt: 'Transform this image into an oil painting style with visible brush strokes, rich textures, and artistic color blending'
  },
  {
    id: 'photo-enhance',
    name: '照片增强',
    icon: '📸',
    description: '提升照片质量和细节',
    prompt: 'Enhance this photo with improved clarity, better lighting, enhanced colors, and sharper details while maintaining natural look'
  },
  {
    id: 'background-blur',
    name: '背景虚化',
    icon: '🌫️',
    description: '虚化背景突出主体',
    prompt: 'Apply professional bokeh effect to blur the background while keeping the main subject sharp and in focus'
  },
  {
    id: 'vintage-film',
    name: '复古胶片',
    icon: '📷',
    description: '复古胶片相机效果',
    prompt: 'Apply vintage film camera effect with grain, faded colors, light leaks, and nostalgic atmosphere'
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    icon: '🌃',
    description: '赛博朋克未来风格',
    prompt: 'Transform into cyberpunk style with neon lights, futuristic elements, dark atmosphere, and high-tech aesthetic'
  },
  {
    id: 'product-detail',
    name: '产品细节图',
    icon: '📦',
    description: '生成产品细节图',
    prompt: '创建一个无缝的 3x3 网格故事板，包含九 (9) 张独特的产品摄影照片。这些照片必须严格基于提供的输入图像中的关键主体（产品）、环境设置和光线条件。核心要求：绝对一致性： 在所有九个画面中，必须保持完全相同的产品型号、材质细节、颜色、环境背景元素和演播室/自然光照方案。电商级摄影质量： 图像应具有高端商业摄影的质感，包括锐利的焦点、丰富的纹理细节和专业的布光。逼真的景深： 随着镜头推进（从远景到微距），背景应呈现出逼真且渐进的柔焦（散景/bokeh）效果，以突出产品主体。格式： 最终输出仅为一张干净的 3x3 网格图像，无任何文字、边框或覆盖层。网格镜头细分：第1排，第1列（环境远景）： 极远景镜头，建立产品在其更广阔环境背景中的位置，展示其生活方式语境或整体尺度。第2列（产品全貌主角）： 完整的全景镜头，清晰展示产品的整体形态，这是标准的电商"主角"展示图。第3列（中景切入）： 中景镜头，构图聚焦于产品的核心主体部分，强调其主要结构和形态。第2排，第1列（中近景聚焦）： 中近景，更紧密地聚焦于产品的一个重要功能区域或部件组合。第2列（材质特写）： 特写镜头，强调特定的设计特征、表面纹理、标志或关键接口（如按钮、织物编织、屏幕显示）。第3列（超细部近景）： 超近景，隔离出产品上复杂的细节，展示精湛的工艺和材料饰面质量。第3排，第1列（微距纹理）： 微距摄影镜头，景深极浅，强烈聚焦于某一关键特征的最微小纹理或材料结构上。第2列（英雄仰拍）： 充满活力的低角度镜头，从地面向上仰拍产品，赋予其宏伟、壮观和令人印象深刻的英雄感。第3列（上帝视角俯拍）： 高角度俯拍（接近平铺/Flat lay），直接向下俯视产品，清晰展示其布局、轮廓或顶部界面。'
  },
  {
    id: 'product-multi-angle',
    name: '产品多角度',
    icon: '🔄',
    description: '生成产品的多角度',
    prompt: '生成产品的多角度拍摄图，包括正视图，左视图，后视图，右视图，俯视图，仰视图，左右45°角'
  },
  {
    id: 'product-retouch',
    name: '产品精修',
    icon: '✨',
    description: '对产品进行商业级精修',
    prompt: '对这个产品进行商业级的产品精修，将精修的产品放置在白色背景上'
  },
  {
    id: 'product-replace',
    name: '产品替换',
    icon: '🔀',
    description: '替换场景中的产品',
    prompt: '将图1的产品放到图2的场景中，替换原有的产品，重新打光，使产品和场景融合自然，有自然光影，产品保持一致'
  }
]

function readInitialConfig() {
  const fromWindow = (window as any).__APP_CONFIG__ || {}
  const fromStorageRaw = localStorage.getItem('app_config')
  const fromStorage = fromStorageRaw ? (JSON.parse(fromStorageRaw) as any) : {}
  const merged = { ...fromWindow, ...fromStorage }

  return {
    apiBaseUrl: String(merged.apiBaseUrl || 'https://api.vectorengine.ai'),
    apiPath: String(
      merged.apiPath || '/v1beta/models/gemini-3-pro-image-preview:generateContent'
    ),
    apiKey: String(merged.apiKey || ''),
    authHeader: (merged.authHeader === 'authorization' ? 'authorization' : 'x-goog-api-key') as AuthHeaderMode
  }
}

type AppMode = 'generate' | 'workflow' | 'inpainting'

export default function App() {
  const initial = useMemo(() => readInitialConfig(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<MaskEditorHandle>(null)

  const [mode, setMode] = useState<AppMode>('generate')
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null)
  const [hasEditorImage, setHasEditorImage] = useState(false)
  const [pendingEditorImage, setPendingEditorImage] = useState<string | null>(null)

  const [apiBaseUrl, setApiBaseUrl] = useState(initial.apiBaseUrl)
  const [apiPath, setApiPath] = useState(initial.apiPath)
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [authHeader, setAuthHeader] = useState<AuthHeaderMode>(initial.authHeader)

  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [imageSize, setImageSize] = useState<SizeOption>(SIZE_OPTIONS[2])

  const [inputImages, setInputImages] = useState<Array<{ mimeType: string; base64Data: string; previewUrl: string; fileName: string }>>([])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [rawBase64, setRawBase64] = useState<string | null>(null)
  const [generationTime, setGenerationTime] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const ratioMeta = useMemo(() => RATIOS.find((r) => r.ratio === aspectRatio) || RATIOS[0], [aspectRatio])
  const resolutionText = useMemo(() => {
    if (!imageSize.imageSize) return '（由模型决定）'
    return ratioMeta.px[imageSize.imageSize] ? `（约 ${ratioMeta.px[imageSize.imageSize]}）` : ''
  }, [imageSize.imageSize, ratioMeta])

  const displayApiKey = useMemo(() => {
    if (showApiKey || !apiKey || apiKey.length <= 12) return apiKey
    return `${apiKey.slice(0, 6)}${'•'.repeat(Math.min(apiKey.length - 12, 20))}${apiKey.slice(-6)}`
  }, [apiKey, showApiKey])

  function persistConfig() {
    localStorage.setItem(
      'app_config',
      JSON.stringify({
        apiBaseUrl,
        apiPath,
        apiKey,
        authHeader
      })
    )
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件')
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        const base64Data = base64.split(',')[1]
        setInputImages(prev => [...prev, {
          mimeType: file.type,
          base64Data,
          previewUrl: base64,
          fileName: file.name
        }])
        setError(null)
      }
      reader.onerror = () => {
        setError('读取图片失败')
      }
      reader.readAsDataURL(file)
    })
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return

    Array.from(items).forEach(item => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          const base64Data = base64.split(',')[1]
          setInputImages(prev => [...prev, {
            mimeType: file.type,
            base64Data,
            previewUrl: base64,
            fileName: `pasted-${Date.now()}.png`
          }])
          setError(null)
        }
        reader.onerror = () => {
          setError('读取图片失败')
        }
        reader.readAsDataURL(file)
      }
    })
  }

  async function onGenerate() {
    setError(null)
    setBusy(true)
    setImgUrl(null)
    setRawBase64(null)
    setGenerationTime(null)
    
    const startTime = Date.now()

    try {
      persistConfig()
      
      let finalPrompt = mode === 'workflow' && selectedWorkflow ? selectedWorkflow.prompt : prompt
      
      let finalInputImages = inputImages.map(img => ({
        mimeType: img.mimeType,
        base64Data: img.base64Data
      }))

      if (mode === 'inpainting' && editorRef.current) {
        const original = editorRef.current.getOriginalData()
        const mask = editorRef.current.getMaskData()
        
        if (original) {
          finalInputImages = [{
            mimeType: 'image/png',
            base64Data: original
          }]
        }
        
        if (mask) {
          // 增强 Prompt，明确指示模型进行 Inpainting
          finalPrompt = `[Instruction]
The first image provided is the original base image.
The second image provided is a mask image (white pixels indicate the editing area, black pixels indicate the protected area).
Please perform an inpainting task: keep the area corresponding to the black pixels in the mask EXACTLY the same as the original image, and only generate new content in the white pixel area based on the user's description.
Do NOT regenerate the entire image. Do NOT change the style, lighting, or composition of the protected areas.

[User Description]
${prompt}`

          finalInputImages.push({
            mimeType: 'image/png',
            base64Data: mask
          })
        }
      }
      
      const img = await generateImage({
        apiBaseUrl,
        apiPath,
        apiKey,
        authHeader,
        prompt: finalPrompt,
        aspectRatio,
        imageSize: imageSize.imageSize,
        inputImages: finalInputImages.length > 0 ? finalInputImages : undefined
      })

      const url = `data:${img.mimeType};base64,${img.base64Data}`
      setImgUrl(url)
      setRawBase64(img.base64Data)
      
      const endTime = Date.now()
      const genTime = Math.round((endTime - startTime) / 1000)
      setGenerationTime(genTime)
      
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        mode,
        prompt: finalPrompt,
        aspectRatio,
        imageSize: imageSize.imageSize,
        workflowId: selectedWorkflow?.id,
        workflowName: selectedWorkflow?.name,
        imageData: img.base64Data,
        mimeType: img.mimeType,
        inputImages: inputImages.length > 0 ? inputImages.map(img => ({
          mimeType: img.mimeType,
          base64Data: img.base64Data
        })) : undefined,
        generationTime: genTime
      }
      
      await saveHistory(historyItem)
      await checkStorageLimit(100)
    } catch (e: any) {
      setError(e?.message ? String(e.message) : String(e))
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!imgUrl) return
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const a = document.createElement('a')
    a.href = imgUrl
    a.download = `generated_${timestamp}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  function handleLayoutEdit() {
    if (!imgUrl) return
    setPendingEditorImage(imgUrl)
    setMode('inpainting')
  }

  useEffect(() => {
    if (mode === 'inpainting' && editorRef.current && pendingEditorImage) {
      editorRef.current.setImage(pendingEditorImage)
      setPendingEditorImage(null)
    }
  }, [mode, pendingEditorImage])

  function handleDragStart(index: number) {
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const newImages = [...inputImages]
    const draggedItem = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedItem)
    
    setInputImages(newImages)
    setDraggedIndex(index)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
  }
  
  function regenerateFromHistory(item: HistoryItem) {
    setMode(item.mode)
    setPrompt(item.prompt)
    setAspectRatio(item.aspectRatio)
    setImageSize(SIZE_OPTIONS.find(s => s.imageSize === item.imageSize) || SIZE_OPTIONS[0])
    
    if (item.mode === 'workflow' && item.workflowId) {
      const workflow = WORKFLOW_TEMPLATES.find(w => w.id === item.workflowId)
      setSelectedWorkflow(workflow || null)
    }
    
    if (item.inputImages) {
      setInputImages(item.inputImages.map((img, index) => ({
        ...img,
        previewUrl: `data:${img.mimeType};base64,${img.base64Data}`,
        fileName: `history-input-${index + 1}.png`
      })))
    } else {
      setInputImages([])
    }
  }

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      Array.from(items).forEach(item => {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) return

          const reader = new FileReader()
          reader.onload = () => {
            const base64 = reader.result as string
            const base64Data = base64.split(',')[1]
            setInputImages(prev => [...prev, {
              mimeType: file.type,
              base64Data,
              previewUrl: base64,
              fileName: `pasted-${Date.now()}.png`
            }])
            setError(null)
          }
          reader.onerror = () => {
            setError('读取图片失败')
          }
          reader.readAsDataURL(file)
        }
      })
    }

    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [])

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-violet-500/30 transition-colors duration-300">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-slate-900/50 px-6 backdrop-blur-xl z-20 transition-colors duration-300">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
             <img src="/icon.svg" className="h-8 w-8 shadow-lg shadow-violet-500/20" alt="Logo" />
             <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">零界设计 <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1 opacity-50">PRO</span></h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 transition-colors duration-300">
            <button
              onClick={() => setMode('generate')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'generate' 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              生图模式
            </button>
            <button
              onClick={() => setMode('workflow')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'workflow' 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <Workflow className="w-4 h-4" />
              工作流模式
            </button>
            <button
              onClick={() => setMode('inpainting')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'inpainting' 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <Brush className="w-4 h-4" />
              局部编辑
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200/50 dark:hover:border-white/5"
            title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setShowHistoryDrawer(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200/50 dark:hover:border-white/5"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">历史记录</span>
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200/50 dark:hover:border-white/5"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Panel - Controls */}
        <aside className={`${mode === 'inpainting' ? 'w-[500px]' : 'w-[400px]'} flex flex-col gap-6 border-r border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-900/20 p-6 overflow-y-auto backdrop-blur-sm z-10 custom-scrollbar transition-all duration-300`}>
          {mode === 'generate' ? (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <ImagePlus className="w-3.5 h-3.5" />
                  参考图片
                </div>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
                <div
                  className="w-full min-h-[100px] p-5 rounded-xl border-2 border-dashed border-slate-300/50 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 hover:border-violet-500/50 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-400 dark:text-slate-400 gap-2 group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const files = e.dataTransfer.files
                    if (files && files.length > 0) {
                      handleImageUpload({ target: { files } } as any)
                    }
                  }}
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  <Upload className="w-8 h-8 text-slate-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors" />
                  <div className="text-sm text-center">点击或拖拽上传图片<br/><span className="text-xs text-slate-500">支持 Ctrl+V 粘贴</span></div>
                </div>

                {inputImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {inputImages.map((img, index) => (
                      <div
                        key={index}
                        className={`relative aspect-square rounded-lg overflow-hidden border border-slate-200/50 dark:border-white/10 group ${draggedIndex === index ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <img src={img.previewUrl} alt={img.fileName} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[10px] truncate text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          {img.fileName}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setInputImages(prev => prev.filter((_, i) => i !== index))
                            if (inputImages.length === 1 && fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }} 
                          className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Wand2 className="w-3.5 h-3.5" />
                  提示词
                </div>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  rows={6} 
                  placeholder="描述你想要生成的画面..." 
                  className="glass-input w-full resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Ratio className="w-3.5 h-3.5" />
                    宽高比
                  </div>
                  <div className="relative">
                    <select 
                      value={aspectRatio} 
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="glass-input w-full appearance-none cursor-pointer"
                    >
                      {RATIOS.map((r) => (
                        <option key={r.ratio} value={r.ratio}>{r.ratio}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Monitor className="w-3.5 h-3.5" />
                    分辨率
                  </div>
                  <div className="relative">
                    <select
                      value={imageSize.label}
                      onChange={(e) => setImageSize(SIZE_OPTIONS.find((s) => s.label === e.target.value) || SIZE_OPTIONS[0])}
                      className="glass-input w-full appearance-none cursor-pointer"
                    >
                      {SIZE_OPTIONS.map((s) => (
                        <option key={s.label} value={s.label}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{resolutionText}</div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-200/50 dark:border-white/5">
                <GenerateButton
                  onClick={onGenerate}
                  disabled={busy || !apiBaseUrl || !apiPath || !apiKey || !prompt}
                >
                  {busy ? '生成中...' : '开始生成'}
                </GenerateButton>
                {error && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </>
          ) : mode === 'workflow' ? (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  工作流模板
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {WORKFLOW_TEMPLATES.map(template => (
                    <div
                      key={template.id}
                      className={`glass-card p-3 rounded-xl cursor-pointer text-left relative overflow-hidden group flex items-center gap-3 ${
                        selectedWorkflow?.id === template.id ? 'ring-2 ring-violet-500 bg-violet-500/10' : 'hover:bg-white/50 dark:hover:bg-white/5'
                      }`}
                      onClick={() => setSelectedWorkflow(template)}
                    >
                      <div className="text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300">{template.icon}</div>
                      <div className="flex flex-col min-w-0">
                        <div className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{template.name}</div>
                        <div className="text-xs text-slate-500 truncate">{template.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                   <ImagePlus className="w-3.5 h-3.5" />
                   参考图片 (必需)
                </div>
                {selectedWorkflow?.id === 'product-replace' && (
                  <div className="text-xs text-yellow-600/80 dark:text-yellow-500/80 mb-2 px-2 py-1 bg-yellow-500/10 rounded border border-yellow-500/20">
                    💡 提示：第一张为产品图，第二张为场景图
                  </div>
                )}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
                <div
                  className="w-full min-h-[100px] p-5 rounded-xl border-2 border-dashed border-slate-300/50 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 hover:border-violet-500/50 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-400 dark:text-slate-400 gap-2 group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const files = e.dataTransfer.files
                    if (files && files.length > 0) {
                      handleImageUpload({ target: { files } } as any)
                    }
                  }}
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  <Upload className="w-8 h-8 text-slate-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors" />
                  <div className="text-sm text-center">点击或拖拽上传图片<br/><span className="text-xs text-slate-500">支持 Ctrl+V 粘贴</span></div>
                </div>
                
                {inputImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {inputImages.map((img, index) => (
                      <div
                        key={index}
                        className={`relative aspect-square rounded-lg overflow-hidden border border-slate-200/50 dark:border-white/10 group ${draggedIndex === index ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <img src={img.previewUrl} alt={img.fileName} className="w-full h-full object-cover" />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setInputImages(prev => prev.filter((_, i) => i !== index))
                            if (inputImages.length === 1 && fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }} 
                          className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Ratio className="w-3.5 h-3.5" />
                    宽高比
                  </div>
                  <div className="relative">
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="glass-input w-full appearance-none cursor-pointer">
                      {RATIOS.map((r) => <option key={r.ratio} value={r.ratio}>{r.ratio}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Monitor className="w-3.5 h-3.5" />
                    分辨率
                  </div>
                  <div className="relative">
                    <select
                      value={imageSize.label}
                      onChange={(e) => setImageSize(SIZE_OPTIONS.find((s) => s.label === e.target.value) || SIZE_OPTIONS[0])}
                      className="glass-input w-full appearance-none cursor-pointer"
                    >
                      {SIZE_OPTIONS.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{resolutionText}</div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-200/50 dark:border-white/5">
                <GenerateButton
                  onClick={onGenerate}
                  disabled={busy || !apiBaseUrl || !apiPath || !apiKey || !selectedWorkflow || inputImages.length === 0}
                >
                  {busy ? '生成中...' : '开始生成'}
                </GenerateButton>
                {error && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </>
          ) : (
            // Inpainting Mode
            <>
              <div className="flex-1 min-h-[530px]">
                 <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Brush className="w-3.5 h-3.5" />
                  绘图区域
                </div>
                <div className="h-[530px] w-full">
                  <ImageMaskEditor ref={editorRef} onImageChange={setHasEditorImage} />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Wand2 className="w-3.5 h-3.5" />
                  提示词
                </div>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  rows={4} 
                  placeholder="描述要对选中区域进行的修改..." 
                  className="glass-input w-full resize-none leading-relaxed"
                />
              </div>

              <div className="mt-auto pt-6 border-t border-slate-200/50 dark:border-white/5">
                <GenerateButton
                  onClick={onGenerate}
                  disabled={busy || !apiBaseUrl || !apiPath || !apiKey || !prompt || !hasEditorImage}
                >
                  {busy ? '生成中...' : '开始生成'}
                </GenerateButton>
                {error && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        {/* Right Panel - Preview */}
        <section className="flex flex-1 flex-col items-center justify-center bg-slate-100/50 dark:bg-black/20 p-8 relative overflow-hidden transition-colors duration-300">
           {/* Background Grid Pattern */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
           
           {busy ? (
             <div className="flex flex-col items-center gap-6 z-10">
               <LoadingSpinner />
               <div className="text-slate-500 dark:text-slate-400 animate-pulse">正在发挥创意...</div>
             </div>
           ) : imgUrl ? (
             <div className="relative max-w-full max-h-full flex flex-col items-center gap-4 z-10 animate-in fade-in zoom-in duration-300">
               <div className="relative group">
                 <img 
                    src={imgUrl} 
                    alt="generated" 
                    className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/50 border border-slate-200/50 dark:border-white/10 cursor-zoom-in"
                    onClick={() => setShowImageModal(true)} 
                  />
                  <button 
                    onClick={() => setShowImageModal(true)}
                    className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="flex items-center gap-6 px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-xl">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-500 uppercase tracking-wider">分辨率</span>
                   <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{imageSize.imageSize ? ratioMeta.px[imageSize.imageSize] : '默认'}</span>
                 </div>
                 <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-500 uppercase tracking-wider">耗时</span>
                   <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{generationTime ? `${generationTime}s` : '-'}</span>
                 </div>
                 <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
                 <button 
                   onClick={handleLayoutEdit}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-xl text-sm font-medium transition-colors text-slate-700 dark:text-white"
                 >
                   <Brush className="w-4 h-4" />
                   布局编辑
                 </button>
                 <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
                 <button 
                   onClick={download}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-xl text-sm font-medium transition-colors text-slate-700 dark:text-white"
                 >
                   <Download className="w-4 h-4" />
                   下载
                 </button>
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-4 text-slate-600 z-10">
               <div className="w-24 h-24 rounded-3xl bg-white/50 dark:bg-white/5 flex items-center justify-center border border-slate-200/50 dark:border-white/5">
                 <Sparkles className="w-10 h-10 opacity-50" />
               </div>
               <div className="text-lg font-medium text-slate-700 dark:text-slate-200">准备好开始创作了吗？</div>
               <div className="text-sm opacity-60">在左侧配置参数，点击生成按钮</div>
             </div>
           )}
        </section>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSettings(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-violet-500" />
                API 设置
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API Base URL</label>
                <input 
                  value={apiBaseUrl} 
                  onChange={(e) => setApiBaseUrl(e.target.value)} 
                  placeholder="https://api.vectorengine.ai" 
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API Path</label>
                <input
                  value={apiPath}
                  onChange={(e) => setApiPath(e.target.value)}
                  placeholder="/v1beta/models/...:generateContent"
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API Key</label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayApiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onFocus={() => setShowApiKey(true)}
                    onBlur={() => setShowApiKey(false)}
                    placeholder="sk-..."
                    className="glass-input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">鉴权 Header</label>
                <div className="relative">
                  <select 
                    value={authHeader} 
                    onChange={(e) => setAuthHeader(e.target.value as AuthHeaderMode)}
                    className="glass-input w-full appearance-none cursor-pointer"
                  >
                    <option value="x-goog-api-key">x-goog-api-key</option>
                    <option value="authorization">Authorization</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
              
              <div className="text-xs text-slate-500 bg-slate-100 dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/5">
                提示：配置会保存在浏览器本地（localStorage）。
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-violet-600/20"
                onClick={() => {
                  persistConfig()
                  setShowSettings(false)
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {showHistoryDrawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistoryDrawer(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-[600px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200/50 dark:border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col transition-colors duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-white/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-violet-500" />
                历史记录
              </h2>
              <button onClick={() => setShowHistoryDrawer(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <HistoryView onRegenerate={(item) => {
                regenerateFromHistory(item)
                setShowHistoryDrawer(false)
              }} />
            </div>
          </div>
        </>
      )}

      {/* Image Modal */}
      {showImageModal && imgUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowImageModal(false)}>
          <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:scale-110" onClick={() => setShowImageModal(false)}>
            <X className="w-6 h-6" />
          </button>
          <img src={imgUrl} alt="Full size" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2" onClick={(e) => e.stopPropagation()}>
             <GenerateButton onClick={download}>下载原图</GenerateButton>
          </div>
        </div>
      )}
    </div>
  )
}
