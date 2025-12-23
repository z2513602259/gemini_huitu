import React, { useMemo, useRef, useState } from 'react'
import { generateImage, type AuthHeaderMode } from './api'
import { GenerateButton } from './GenerateButton'
import { LoadingSpinner } from './LoadingSpinner'

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

export default function App() {
  const initial = useMemo(() => readInitialConfig(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function onGenerate() {
    setError(null)
    setBusy(true)
    setImgUrl(null)
    setRawBase64(null)
    setGenerationTime(null)
    
    const startTime = Date.now()

    try {
      persistConfig()
      const img = await generateImage({
        apiBaseUrl,
        apiPath,
        apiKey,
        authHeader,
        prompt,
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
      setGenerationTime(Math.round((endTime - startTime) / 1000))
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

  return (
    <div className="page">
      <div className="topBar">
        <div className="topBarLeft">
          <h1 style={{display: 'flex', alignItems: 'center', margin: 0}}><img src="/icon.svg" alt="logo" style={{width: '32px', height: '32px', marginRight: '12px'}} />零界设计</h1>
        </div>
        <div className="topBarRight">
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
            >
              <div>点击选择文件或拖拽文件到此处</div>
            </div>
            {inputImages.length > 0 && (
              <div className="imagesGrid">
                {inputImages.map((img, index) => (
                  <div key={index} className="imageItem">
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
      </div>
    </div>
  )
}
