import React from 'react'
import { Sparkles } from 'lucide-react'

interface GenerateButtonProps {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

export function GenerateButton({ onClick, disabled, children }: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 
        text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300
        hover:scale-[1.02] hover:shadow-violet-500/40 active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none
      `}
    >
      <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="relative flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 animate-pulse" />
        {children}
      </span>
    </button>
  )
}
