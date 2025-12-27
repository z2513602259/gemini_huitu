import React, { useEffect, useMemo, useRef, useState } from 'react'
import { generateImage, type AuthHeaderMode } from './api'
import { GenerateButton } from './GenerateButton'
import { LoadingSpinner } from './LoadingSpinner'
import { HistoryView } from './HistoryView'
import { saveHistory, checkStorageLimit } from './historyDB'
import type { HistoryItem } from './types'

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
    prompt: '将图1的产品放到图2的场景中，替换原有的产品，重新打光，使产品和场景融合自然，有自然光影，产品保持一致，去除场景中的文字和logo'
  }
]

function readInitialConfig() {
  const fromWindow = window.__APP_CONFIG__ || {}
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

type AppMode = 'generate' | 'workflow'

export default function App() {
  const initial = useMemo(() => readInitialConfig(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<AppMode>('generate')
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null)

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

  const ratioMeta = useMemo(() => RATIOS.find((r) => r.ratio === aspectRatio) || RATIOS[0], [aspectRatio])
  const resolutionText = useMemo(() => {
    if (!imageSize.imageSize) return '（由模型决定）'
    return ratioMeta.px[imageSize.imageSize] ? `（约 ${ratioMeta.px[imageSize.imageSize]}）` : ''
  }, [imageSize.imageSize, ratioMeta])

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
      
      // 工作流模式使用预设提示词，生图模式使用用户输入的提示词
      const finalPrompt = mode === 'workflow' && selectedWorkflow ? selectedWorkflow.prompt : prompt
      
      const img = await generateImage({
        apiBaseUrl,
        apiPath,
        apiKey,
        authHeader,
        prompt: finalPrompt,
        aspectRatio,
        imageSize: imageSize.imageSize,
        inputImages: inputImages.length > 0 ? inputImages.map(img => ({
          mimeType: img.mimeType,
          base64Data: img.base64Data
        })) : undefined
      })

      const url = `data:${img.mimeType};base64,${img.base64Data}`
      setImgUrl(url)
      setRawBase64(img.base64Data)
      
      const endTime = Date.now()
      const genTime = Math.round((endTime - startTime) / 1000)
      setGenerationTime(genTime)
      
      // 保存到历史记录
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
  
  // 从历史记录重新生成
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
    <div className="page">
      <div className="topBar">
        <div className="topBarLeft">
          <h1 style={{display: 'flex', alignItems: 'center', margin: 0}}><img src="/icon.svg" alt="logo" style={{width: '32px', height: '32px', marginRight: '12px'}} />零界设计</h1>
          <div className="modeTabs">
            <button
              className={`modeTab ${mode === 'generate' ? 'active' : ''}`}
              onClick={() => setMode('generate')}
            >
              🎨 生图模式
            </button>
            <button
              className={`modeTab ${mode === 'workflow' ? 'active' : ''}`}
              onClick={() => setMode('workflow')}
            >
              🔄 工作流模式 (Beta)
            </button>
          </div>
        </div>
        <div className="topBarRight">
          <button className="settingsBtn" onClick={() => setShowHistoryDrawer(true)}>
            📜 历史记录
          </button>
          <button className="settingsBtn" onClick={() => setShowSettings(true)}>
            ⚙️ 设置
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="modal" onClick={() => setShowSettings(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>API 设置</h2>
              <button className="closeBtn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="modalBody">
              <label className="field">
                <div className="label">API Base URL</div>
                <input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="https://api.vectorengine.ai" />
              </label>

              <label className="field">
                <div className="label">API Path</div>
                <input
                  value={apiPath}
                  onChange={(e) => setApiPath(e.target.value)}
                  placeholder="/v1beta/models/...:generateContent"
                />
              </label>

              <label className="field">
                <div className="label">API Key</div>
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
              </label>

              <label className="field">
                <div className="label">鉴权 Header</div>
                <select value={authHeader} onChange={(e) => setAuthHeader(e.target.value as AuthHeaderMode)}>
                  <option value="x-goog-api-key">x-goog-api-key</option>
                  <option value="authorization">Authorization</option>
                </select>
              </label>

              <div className="hint">
                提示：配置会保存在浏览器本地（localStorage）。你也可以在部署后通过修改 <code>config.js</code> 提供默认值。
              </div>
            </div>
            <div className="modalFooter">
              <button className="primary" onClick={() => setShowSettings(false)}>确定</button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && imgUrl && (
        <div className="imageModal" onClick={() => setShowImageModal(false)}>
          <button className="imageModalClose" onClick={() => setShowImageModal(false)}>✕</button>
          <img src={imgUrl} alt="Full size" onClick={(e) => e.stopPropagation()} />
          <div className="imageModalToolbar" onClick={(e) => e.stopPropagation()}>
            <GenerateButton onClick={download}>下载原图</GenerateButton>
          </div>
        </div>
      )}

      <div className="mainContent">
        {mode === 'generate' ? (
          <>
            <section className="leftPanel">
              <div className="cardTitle">生成参数</div>

          <div className="field">
            <div className="label">参考图片（可选，支持多张）</div>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} ref={fileInputRef} style={{display: 'none'}} />
            <div
              className="fileDropZone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const files = e.dataTransfer.files
                if (files && files.length > 0) {
                  const event = { target: { files } } as any
                  handleImageUpload(event)
                }
              }}
              onPaste={handlePaste}
              tabIndex={0}
            >
              <div>点击选择文件、拖拽文件或粘贴图片到此处</div>
            </div>
            {inputImages.length > 0 && (
              <div className="imagesGrid">
                {inputImages.map((img, index) => (
                  <div
                    key={index}
                    className={`imageItem ${draggedIndex === index ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <img src={img.previewUrl} alt={img.fileName} />
                    <div className="fileName">{img.fileName}</div>
                    <button onClick={() => {
                      setInputImages(prev => prev.filter((_, i) => i !== index))
                      if (inputImages.length === 1 && fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }} className="removeBtn">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="field">
            <div className="label">提示词</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} placeholder="在这里输入提示词" />
          </label>

          <div className="grid2">
            <label className="field">
              <div className="label">宽高比</div>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                {RATIOS.map((r) => (
                  <option key={r.ratio} value={r.ratio}>
                    {r.ratio}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <div className="label">分辨率档位 {resolutionText}</div>
              <select
                value={imageSize.label}
                onChange={(e) => setImageSize(SIZE_OPTIONS.find((s) => s.label === e.target.value) || SIZE_OPTIONS[0])}
              >
                {SIZE_OPTIONS.map((s) => (
                  <option key={s.label} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="actions">
            <GenerateButton
              onClick={onGenerate}
              disabled={busy || !apiBaseUrl || !apiPath || !apiKey || !prompt}
            >
              {busy ? '生成中…' : '生成图片'}
            </GenerateButton>
          </div>

          {error ? <div className="error">{error}</div> : null}
            </section>

            <section className="rightPanel">
              <div className="cardTitle">结果预览</div>
              {busy ? (
                <div className="loadingContainer">
                  <LoadingSpinner />
                  <div>正在生成中...</div>
                </div>
              ) : imgUrl ? (
                <div className="preview">
                  <img src={imgUrl} alt="generated" onClick={() => setShowImageModal(true)} title="点击查看大图" />
                  <div className="meta">
                    <div>
                      <span className="k">比例：</span>
                      <span className="v">{aspectRatio}</span>
                    </div>
                    <div>
                      <span className="k">分辨率：</span>
                      <span className="v">{imageSize.imageSize ? ratioMeta.px[imageSize.imageSize] || '-' : '默认'}</span>
                    </div>
                    <div>
                      <span className="k">Base64：</span>
                      <span className="v">{rawBase64 ? `${rawBase64.length} chars` : '-'}</span>
                    </div>
                    <div>
                      <span className="k">生成用时：</span>
                      <span className="v">
                        {generationTime !== null
                          ? `${Math.floor(generationTime / 60)}分${generationTime % 60}秒`
                          : '-'}
                      </span>
                    </div>
                    <div style={{marginTop: '12px'}}>
                      <GenerateButton onClick={download}>下载图片</GenerateButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">还没有生成图片</div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="leftPanel">
              <div className="cardTitle">工作流参数</div>

              <div className="field">
                <div className="label">选择工作流模板</div>
                <div className="workflowGrid">
                  {WORKFLOW_TEMPLATES.map(template => (
                    <div
                      key={template.id}
                      className={`workflowCard ${selectedWorkflow?.id === template.id ? 'active' : ''}`}
                      onClick={() => setSelectedWorkflow(template)}
                    >
                      <div className="workflowIcon">{template.icon}</div>
                      <div className="workflowName">{template.name}</div>
                      <div className="workflowDesc">{template.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="field">
                <div className="label">参考图片（必需，支持多张）</div>
                {selectedWorkflow?.id === 'product-replace' && (
                  <div style={{fontSize: '12px', color: 'var(--muted2)', marginTop: '4px'}}>💡 提示：第一张为产品图，第二张为场景图</div>
                )}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} ref={fileInputRef} style={{display: 'none'}} />
                <div
                  className="fileDropZone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const files = e.dataTransfer.files
                    if (files && files.length > 0) {
                      const event = { target: { files } } as any
                      handleImageUpload(event)
                    }
                  }}
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  <div>点击选择文件、拖拽文件或粘贴图片到此处</div>
                </div>
                {inputImages.length > 0 && (
                  <div className="imagesGrid">
                    {inputImages.map((img, index) => (
                      <div
                        key={index}
                        className={`imageItem ${draggedIndex === index ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <img src={img.previewUrl} alt={img.fileName} />
                        <div className="fileName">{img.fileName}</div>
                        <button onClick={() => {
                          setInputImages(prev => prev.filter((_, i) => i !== index))
                          if (inputImages.length === 1 && fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }} className="removeBtn">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid2">
                <label className="field">
                  <div className="label">宽高比</div>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                    {RATIOS.map((r) => (
                      <option key={r.ratio} value={r.ratio}>
                        {r.ratio}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <div className="label">分辨率档位 {resolutionText}</div>
                  <select
                    value={imageSize.label}
                    onChange={(e) => setImageSize(SIZE_OPTIONS.find((s) => s.label === e.target.value) || SIZE_OPTIONS[0])}
                  >
                    {SIZE_OPTIONS.map((s) => (
                      <option key={s.label} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="actions">
                <GenerateButton
                  onClick={onGenerate}
                  disabled={busy || !apiBaseUrl || !apiPath || !apiKey || !selectedWorkflow || inputImages.length === 0}
                >
                  {busy ? '生成中…' : '生成图片'}
                </GenerateButton>
              </div>

              {error ? <div className="error">{error}</div> : null}
            </section>

            <section className="rightPanel">
              <div className="cardTitle">结果预览</div>
              {busy ? (
                <div className="loadingContainer">
                  <LoadingSpinner />
                  <div>正在生成中...</div>
                </div>
              ) : imgUrl ? (
                <div className="preview">
                  <img src={imgUrl} alt="generated" onClick={() => setShowImageModal(true)} title="点击查看大图" />
                  <div className="meta">
                    <div>
                      <span className="k">工作流：</span>
                      <span className="v">{selectedWorkflow?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="k">比例：</span>
                      <span className="v">{aspectRatio}</span>
                    </div>
                    <div>
                      <span className="k">分辨率：</span>
                      <span className="v">{imageSize.imageSize ? ratioMeta.px[imageSize.imageSize] || '-' : '默认'}</span>
                    </div>
                    <div>
                      <span className="k">生成用时：</span>
                      <span className="v">
                        {generationTime !== null
                          ? `${Math.floor(generationTime / 60)}分${generationTime % 60}秒`
                          : '-'}
                      </span>
                    </div>
                    <div style={{marginTop: '12px'}}>
                      <GenerateButton onClick={download}>下载图片</GenerateButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">还没有生成图片</div>
              )}
            </section>
          </>
        )}
      </div>
      {showHistoryDrawer && (
        <>
          <div className="historyDrawerOverlay" onClick={() => setShowHistoryDrawer(false)} />
          <div className="historyDrawer">
            <div className="historyDrawerHeader">
              <h2>历史记录</h2>
              <button className="closeBtn" onClick={() => setShowHistoryDrawer(false)}>✕</button>
            </div>
            <div className="historyDrawerContent">
              <HistoryView onRegenerate={(item) => {
                regenerateFromHistory(item)
                setShowHistoryDrawer(false)
              }} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
