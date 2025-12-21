export {}

declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiBaseUrl?: string
      apiKey?: string
      authHeader?: 'authorization' | 'x-goog-api-key'
      apiPath?: string
      model?: string
    }
  }
}
