import type { HistoryItem } from './types'

const DB_NAME = 'ImageGenHistory'
const DB_VERSION = 1
const STORE_NAME = 'history'

// 初始化数据库
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('mode', 'mode', { unique: false })
      }
    }
  })
}

// 保存历史记录
export async function saveHistory(item: HistoryItem): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(item)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// 获取历史记录列表（按时间倒序）
export async function getHistory(limit?: number, offset: number = 0): Promise<HistoryItem[]> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    const request = index.openCursor(null, 'prev')
    
    const items: HistoryItem[] = []
    let count = 0
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        if (count >= offset) {
          items.push(cursor.value)
          if (limit && items.length >= limit) {
            resolve(items)
            return
          }
        }
        count++
        cursor.continue()
      } else {
        resolve(items)
      }
    }
    
    request.onerror = () => reject(request.error)
  })
}

// 删除历史记录
export async function deleteHistory(id: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// 批量删除
export async function deleteHistoryBatch(ids: string[]): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    let completed = 0
    ids.forEach(id => {
      const request = store.delete(id)
      request.onsuccess = () => {
        completed++
        if (completed === ids.length) resolve()
      }
      request.onerror = () => reject(request.error)
    })
    
    if (ids.length === 0) resolve()
  })
}

// 清空全部
export async function clearHistory(): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// 搜索历史记录
export async function searchHistory(keyword: string): Promise<HistoryItem[]> {
  const items = await getHistory()
  const lowerKeyword = keyword.toLowerCase()
  
  return items.filter(item => 
    item.prompt.toLowerCase().includes(lowerKeyword) ||
    (item.workflowName && item.workflowName.toLowerCase().includes(lowerKeyword))
  )
}

// 自动清理超过限制的旧记录
export async function checkStorageLimit(maxItems: number = 100): Promise<void> {
  const items = await getHistory()
  
  if (items.length > maxItems) {
    const toDelete = items.slice(maxItems)
    await deleteHistoryBatch(toDelete.map(item => item.id))
  }
}
