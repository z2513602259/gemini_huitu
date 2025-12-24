import React, { useState, useEffect } from 'react'
import type { HistoryItem } from './types'
import { getHistory, deleteHistory, clearHistory, searchHistory } from './historyDB'

// 工具函数
function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : text.slice(0, maxLength) + '...'
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 历史详情模态框
function HistoryDetailModal({ 
  item, 
  onClose, 
  onRegenerate, 
  onDelete 
}: { 
  item: HistoryItem
  onClose: () => void
  onRegenerate: (item: HistoryItem) => void
  onDelete: (id: string) => void
}) {
  function handleDownload() {
    const a = document.createElement('a')
    a.href = `data:${item.mimeType};base64,${item.imageData}`
    a.download = `generated_${item.timestamp}.png`
    a.click()
  }
  
  function handleDelete() {
    if (confirm('确定删除这条历史记录吗？')) {
      onDelete(item.id)
      onClose()
    }
  }
  
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2>历史记录详情</h2>
          <button className="closeBtn" onClick={onClose}>✕</button>
        </div>
        <div className="modalBody">
          <img 
            src={`data:${item.mimeType};base64,${item.imageData}`}
            alt="历史图片"
            style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }}
          />
          
          <div className="field">
            <div className="label">📝 提示词</div>
            <div style={{ padding: '8px', background: 'var(--panel2)', borderRadius: '8px', fontSize: '14px' }}>
              {item.prompt}
            </div>
          </div>
          
          <div className="field">
            <div className="label">⚙️ 参数</div>
            <div style={{ padding: '8px', background: 'var(--panel2)', borderRadius: '8px', fontSize: '13px' }}>
              <div>模式：{item.mode === 'generate' ? '生图模式' : item.workflowName}</div>
              <div>宽高比：{item.aspectRatio}</div>
              <div>分辨率：{item.imageSize || '默认'}</div>
              <div>生成时间：{new Date(item.timestamp).toLocaleString('zh-CN')}</div>
              {item.generationTime && <div>耗时：{item.generationTime}秒</div>}
            </div>
          </div>
          
          {item.inputImages && item.inputImages.length > 0 && (
            <div className="field">
              <div className="label">🖼️ 参考图片</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {item.inputImages.map((img, index) => (
                  <img 
                    key={index}
                    src={`data:${img.mimeType};base64,${img.base64Data}`}
                    alt={`参考图${index + 1}`}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modalFooter">
          <button onClick={() => { onRegenerate(item); onClose(); }}>重新生成</button>
          <button onClick={handleDownload}>下载</button>
          <button onClick={handleDelete} style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>删除</button>
          <button className="primary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

// 历史记录卡片
function HistoryCard({ 
  item, 
  onDelete, 
  onRegenerate 
}: { 
  item: HistoryItem
  onDelete: (id: string) => void
  onRegenerate: (item: HistoryItem) => void
}) {
  const [showDetail, setShowDetail] = useState(false)
  
  return (
    <>
      <div className="historyCard">
        <img 
          src={`data:${item.mimeType};base64,${item.imageData}`}
          alt="历史图片"
          onClick={() => setShowDetail(true)}
        />
        <div className="historyCardInfo">
          <div className="historyPrompt">{truncate(item.prompt, 50)}</div>
          <div className="historyMeta">
            <span>{item.mode === 'generate' ? '生图' : item.workflowName}</span>
            <span>{item.imageSize || '默认'} ({item.aspectRatio})</span>
          </div>
          <div className="historyTime">{formatTime(item.timestamp)}</div>
        </div>
        <div className="historyActions">
          <button onClick={() => setShowDetail(true)}>查看</button>
          <button onClick={() => onRegenerate(item)}>重生成</button>
          <button onClick={() => {
            if (confirm('确定删除这条历史记录吗？')) {
              onDelete(item.id)
            }
          }}>删除</button>
        </div>
      </div>
      
      {showDetail && (
        <HistoryDetailModal 
          item={item}
          onClose={() => setShowDetail(false)}
          onRegenerate={onRegenerate}
          onDelete={onDelete}
        />
      )}
    </>
  )
}

// 历史记录主视图
export function HistoryView({ 
  onRegenerate 
}: { 
  onRegenerate: (item: HistoryItem) => void
}) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'generate' | 'workflow'>('all')
  
  useEffect(() => {
    loadHistory()
  }, [])
  
  async function loadHistory() {
    try {
      const items = await getHistory(100)
      setHistoryItems(items)
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function handleSearch(keyword: string) {
    setSearchKeyword(keyword)
    if (keyword.trim()) {
      try {
        const results = await searchHistory(keyword)
        setHistoryItems(results)
      } catch (error) {
        console.error('搜索失败:', error)
      }
    } else {
      loadHistory()
    }
  }
  
  async function handleDelete(id: string) {
    try {
      await deleteHistory(id)
      loadHistory()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }
  
  async function handleClearAll() {
    if (confirm('确定清空所有历史记录吗？此操作不可恢复！')) {
      try {
        await clearHistory()
        loadHistory()
      } catch (error) {
        console.error('清空失败:', error)
      }
    }
  }
  
  const filteredItems = filterMode === 'all' 
    ? historyItems 
    : historyItems.filter(item => item.mode === filterMode)
  
  if (loading) {
    return (
      <div className="historyView">
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          加载中...
        </div>
      </div>
    )
  }
  
  return (
    <div className="historyView">
      <div className="historyToolbar">
        <input 
          type="text" 
          placeholder="搜索提示词..." 
          value={searchKeyword}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as any)}>
          <option value="all">全部模式</option>
          <option value="generate">生图模式</option>
          <option value="workflow">工作流模式</option>
        </select>
        <button onClick={handleClearAll}>🗑️ 清空全部</button>
      </div>
      
      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          {searchKeyword ? '没有找到匹配的历史记录' : '还没有历史记录'}
        </div>
      ) : (
        <div className="historyGrid">
          {filteredItems.map(item => (
            <HistoryCard 
              key={item.id} 
              item={item}
              onDelete={handleDelete}
              onRegenerate={onRegenerate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
