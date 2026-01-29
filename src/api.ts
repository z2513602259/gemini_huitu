export type AuthHeaderMode = 'authorization' | 'x-goog-api-key'

export type GenerateImageRequest = {
  apiBaseUrl: string
  apiPath: string
  apiKey: string
  authHeader: AuthHeaderMode
  prompt: string
  aspectRatio: string
  imageSize?: '1K' | '2K' | '4K'
  inputImages?: Array<{
    mimeType: string
    base64Data: string
  }>
  maskData?: string
}

export type GeneratedImage = {
  mimeType: string
  base64Data: string
}

function joinUrl(baseUrl: string, path: string): string {
  const b = baseUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

function headersFor(authHeader: AuthHeaderMode, apiKey: string): Record<string, string> {
  if (authHeader === 'authorization') {
    return {
      Authorization: apiKey,
      'Content-Type': 'application/json'
    }
  }
  return {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json'
  }
}

function extractInlineData(obj: unknown): GeneratedImage | null {
  if (!obj || typeof obj !== 'object') return null

  // candidates[0].content.parts[*].inlineData or inline_data
  const candidates = (obj as any).candidates
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  const parts = candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null

  for (const part of parts) {
    const inlineData = part?.inlineData ?? part?.inline_data
    if (!inlineData) continue
    const data = inlineData?.data
    if (typeof data !== 'string' || data.length === 0) continue
    const mimeType = inlineData?.mimeType ?? inlineData?.mime_type ?? 'image/png'
    if (typeof mimeType !== 'string' || mimeType.length === 0) {
      return { mimeType: 'image/png', base64Data: data }
    }
    return { mimeType, base64Data: data }
  }

  return null
}

export async function generateImage(req: GenerateImageRequest): Promise<GeneratedImage> {
  const url = joinUrl(req.apiBaseUrl, req.apiPath)

  const parts: any[] = []
  
  if (req.inputImages && req.inputImages.length > 0) {
    req.inputImages.forEach(img => {
      parts.push({
        inline_data: {
          mime_type: img.mimeType,
          data: img.base64Data
        }
      })
    })
  }

  if (req.maskData) {
    parts.push({
      inline_data: {
        mime_type: 'image/png',
        data: req.maskData
      }
    })
  }

  parts.push({ text: req.prompt })

  const body: any = {
    contents: [
      {
        parts
      }
    ],
    generationConfig: {
      imageConfig: {
        aspectRatio: req.aspectRatio
      }
    }
  }

  if (req.imageSize) {
    body.generationConfig.imageConfig.imageSize = req.imageSize
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: headersFor(req.authHeader, req.apiKey),
    body: JSON.stringify(body)
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`响应不是 JSON：${text.slice(0, 500)}`)
  }

  const img = extractInlineData(json)
  if (!img) {
    throw new Error('未在响应中找到图片数据（inlineData/inline_data）')
  }

  return img
}
