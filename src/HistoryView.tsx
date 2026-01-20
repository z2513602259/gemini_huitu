import React, { useState, useEffect } from 'react'
import type { HistoryItem } from './types'
import { getHistory, deleteHistory, clearHistory, searchHistory } from './historyDB'
import { X, Download, Trash2, Search, Filter, RefreshCw, Eye, Calendar, Clock, Image as ImageIcon } from 'lucide-react'

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">历史记录详情</h2>
          <button className="p-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-lg transition-colors" onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="aspect-auto w-full overflow-hidden rounded-xl border border-slate-200/50 dark:border-white/10 bg-slate-100 dark:bg-black/20">
            <img 
              src={`data:${item.mimeType};base64,${item.imageData}`}
              alt="历史图片"
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                提示词
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-sm text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200/50 dark:border-white/5 select-text">
                {item.prompt}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200/50 dark:border-white/5 space-y-2">
                 <div className="text-xs text-slate-500 uppercase tracking-wider">参数信息</div>
                 <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><span>模式</span> <span className="text-slate-900 dark:text-white">{item.mode === 'generate' ? '生图模式' : item.workflowName}</span></div>
                    <div className="flex justify-between"><span>宽高比</span> <span className="text-slate-900 dark:text-white">{item.aspectRatio}</span></div>
                    <div className="flex justify-between"><span>分辨率</span> <span className="text-slate-900 dark:text-white">{item.imageSize || '默认'}</span></div>
                 </div>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200/50 dark:border-white/5 space-y-2">
                 <div className="text-xs text-slate-500 uppercase tracking-wider">生成信息</div>
                 <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><span>时间</span> <span className="text-slate-900 dark:text-white">{new Date(item.timestamp).toLocaleTimeString()}</span></div>
                    <div className="flex justify-between"><span>日期</span> <span className="text-slate-900 dark:text-white">{new Date(item.timestamp).toLocaleDateString()}</span></div>
                    {item.generationTime && <div className="flex justify-between"><span>耗时</span> <span className="text-slate-900 dark:text-white">{item.generationTime}s</span></div>}
                 </div>
              </div>
            </div>
            
            {item.inputImages && item.inputImages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  参考图片
                </div>
                <div className="flex gap-3 flex-wrap">
                  {item.inputImages.map((img, index) => (
                    <div key={index} className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200/50 dark:border-white/10">
                      <img 
                        src={`data:${img.mimeType};base64,${img.base64Data}`}
                        alt={`参考图${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-200/50 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5">
          <button 
            onClick={handleDelete} 
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-sm font-medium transition-colors border border-red-500/20 flex items-center gap-2 whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" /> 删除
          </button>
          <div className="flex-1"></div>
          <button 
            onClick={handleDownload} 
            className="px-4 py-2 bg-white hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl text-sm font-medium transition-colors border border-slate-200/50 dark:border-white/10 flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> 下载
          </button>
          <button 
            onClick={() => { onRegenerate(item); onClose(); }} 
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-violet-600/20 flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" /> 重新生成
          </button>
        </div>
      </div>
    </div>
  )
}

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
      <div className="group relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 transition-all hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1">
        <div className="aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900 relative cursor-pointer" onClick={() => setShowDetail(true)}>
          <img 
            src={`data:${item.mimeType};base64,${item.imageData}`}
            alt="历史图片"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
             <div className="flex gap-2 w-full">
               <button 
                 onClick={(e) => { e.stopPropagation(); setShowDetail(true); }} 
                 className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-sm text-xs font-medium transition-colors"
               >
                 查看
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onRegenerate(item); }} 
                 className="flex-1 py-1.5 bg-violet-600/90 hover:bg-violet-600 rounded-lg text-white backdrop-blur-sm text-xs font-medium transition-colors"
               >
                 重画
               </button>
             </div>
          </div>
        </div>
        
        <div className="p-3">
          <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-2 h-10 leading-relaxed" title={item.prompt}>
            {truncate(item.prompt, 50)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(item.timestamp)}
            </div>
            <button 
              onClick={() => {
                if (confirm('确定删除这条历史记录吗？')) {
                  onDelete(item.id)
                }
              }} 
              className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
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
      <div className="flex items-center justify-center h-40 text-slate-500">
        <div className="animate-spin mr-2"><RefreshCw className="w-4 h-4"/></div> 加载中...
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-500 transition-colors" />
          <input 
            type="text" 
            placeholder="搜索提示词..." 
            value={searchKeyword}
            onChange={(e) => handleSearch(e.target.value)}
            className="glass-input w-full !pl-10"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
             <select 
               value={filterMode} 
               onChange={(e) => setFilterMode(e.target.value as any)}
               className="glass-input w-full appearance-none cursor-pointer !pl-10"
             >
               <option value="all">全部模式</option>
               <option value="generate">生图模式</option>
               <option value="workflow">工作流模式</option>
             </select>
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          </div>
          
          <button 
            onClick={handleClearAll}
            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-colors border border-red-500/20"
            title="清空全部"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-3 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
          <ImageIcon className="w-10 h-10 opacity-50" />
          <div className="text-sm">{searchKeyword ? '没有找到匹配的历史记录' : '还没有历史记录'}</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 pb-4">
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
